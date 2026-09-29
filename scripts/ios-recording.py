#!/usr/bin/env python3
"""Build, run and record the real UI flow on iOS 27. Requires ffmpeg on PATH."""
import json
import os
from pathlib import Path
import signal
import subprocess
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
IOS = ROOT / "apps/ios"
BUILD = IOS / "build"
OUTPUT = ROOT / "store/ios/app-flow.mp4"


def run(*args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def main():
    devices = json.loads(subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "-j"]))
    candidates = devices["devices"].get("com.apple.CoreSimulator.SimRuntime.iOS-27-0", [])
    # Use the dedicated capture phone, not the default phone paired to the Watch test device.
    device = next((d["udid"] for d in candidates if d["name"] == "Padel iPhone 18 Pro Max"), None)
    if device is None:
        device = subprocess.check_output(["xcrun", "simctl", "create", "Padel iPhone 18 Pro Max",
                                          "com.apple.CoreSimulator.SimDeviceType.iPhone-18-Pro-Max",
                                          "com.apple.CoreSimulator.SimRuntime.iOS-27-0"], text=True).strip()
    BUILD.mkdir(exist_ok=True)
    run("xcodegen", "generate", "--quiet", cwd=IOS)
    xcode = ["/usr/bin/xcodebuild", "-project", "Padel.xcodeproj", "-scheme", "Padel",
             "-destination", f"id={device}", "-derivedDataPath", "build/dd",
             "-parallel-testing-enabled", "NO", "-only-testing:PadelUITests/StoreFlowRecording"]
    with (BUILD / "recording-build.log").open("w") as log:
        run(*xcode, "build-for-testing", cwd=IOS, stdout=log, stderr=subprocess.STDOUT)
    run("xcrun", "simctl", "bootstatus", device, "-b")
    run("xcrun", "simctl", "ui", device, "appearance", "light")
    run("xcrun", "simctl", "status_bar", device, "override", "--time", "9:41",
        "--dataNetwork", "wifi", "--wifiMode", "active", "--wifiBars", "3",
        "--cellularMode", "active", "--cellularBars", "4", "--batteryState", "charged", "--batteryLevel", "100")
    raw = BUILD / "app-flow-raw.mov"
    recorder = subprocess.Popen(["xcrun", "simctl", "io", device, "recordVideo", "--codec=h264", "--force", str(raw)],
                                stderr=subprocess.PIPE, text=True)
    ready = threading.Event()
    first_frame = []

    def watch_recorder():
        for line in recorder.stderr:
            if "Recording started" in line:
                first_frame.append(time.monotonic())
                ready.set()

    reader = threading.Thread(target=watch_recorder, daemon=True)
    reader.start()
    try:
        if not ready.wait(30):
            raise RuntimeError("Simulator recording did not start")
        env = dict(os.environ, TEST_RUNNER_STORE_RECORDING="1")
        markers = {}
        with (BUILD / "recording-test.log").open("w") as log:
            test = subprocess.Popen([*xcode, "test-without-building", "-resultBundlePath", f"build/recording-{int(time.time())}.xcresult"],
                                    cwd=IOS, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                    text=True, bufsize=1)
            for line in test.stdout:
                log.write(line)
                log.flush()
                for marker in ("STORE_FLOW_START", "STORE_FLOW_END"):
                    if line.startswith(marker):
                        markers[marker] = time.monotonic()
            if test.wait() != 0:
                raise RuntimeError("Flow test failed; see apps/ios/build/recording-test.log")
    finally:
        if recorder.poll() is None:
            recorder.send_signal(signal.SIGINT)
            recorder.wait(timeout=30)
        reader.join(timeout=5)
        run("xcrun", "simctl", "status_bar", device, "clear")
    if recorder.returncode != 0:
        raise RuntimeError(f"Recording failed: {recorder.returncode}")
    # Use host arrival times: the simulator's wall clock can drift from the host's clock.
    start, end = markers["STORE_FLOW_START"], markers["STORE_FLOW_END"]
    # Remove the test runner/launch screens, retaining the uninterrupted app flow.
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    staged = BUILD / "app-flow.mp4"
    run("ffmpeg", "-y", "-v", "error", "-ss", str(max(0, start - first_frame[0])), "-i", str(raw),
        "-t", str(end - start), "-an", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(staged))
    staged.replace(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
