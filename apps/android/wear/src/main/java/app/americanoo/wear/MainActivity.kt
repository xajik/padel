package app.americanoo.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import app.americanoo.data.DemoData
import app.americanoo.wear.ui.WearApp
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    /** The game on screen, synced every few seconds while the app is visible (like the phone). */
    val openCode = MutableStateFlow<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repo = padel.repository
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                var tick = 0
                while (true) {
                    openCode.value?.let { repo.sync(repo.resolve(it)) }
                    if (tick++ % 8 == 0) repo.syncAll()
                    delay(4_000)
                }
            }
        }
        // Debug builds: `adb shell am start … --es join <organizer link>` adds a game without a paired phone.
        if (BuildConfig.DEBUG) intent.getStringExtra("join")?.let { link -> lifecycleScope.launch { runCatching { repo.join(link) } } }
        // Debug builds: `--ez demo true` seeds the store screenshot games (scripts/wear-screenshots.sh).
        if (BuildConfig.DEBUG && intent.getBooleanExtra("demo", false)) lifecycleScope.launch { DemoData.seed(repo) }
        setContent { WearApp(repo, onOpen = { openCode.value = it }) }
    }
}
