package app.americanoo.engine

import kotlinx.cinterop.BetaInteropApi
import kotlinx.cinterop.ExperimentalForeignApi
import platform.Foundation.NSString
import platform.Foundation.NSUTF8StringEncoding
import platform.Foundation.stringWithContentsOfFile

// The simulator shares the host file system, so the repo path works as-is.
@OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)
internal actual fun readFixture(name: String): String =
    NSString.stringWithContentsOfFile("$FIXTURES_DIR/$name", NSUTF8StringEncoding, null)
        ?: error("Missing fixture $FIXTURES_DIR/$name — run `npm run fixtures -w @padel/engine`")
