package app.americanoo.android

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import app.americanoo.android.ui.PadelNavHost
import app.americanoo.android.ui.theme.PadelTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val model: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        // Instrumented tests and screenshot runs start clean and/or with demo games.
        if (savedInstanceState == null) {
            val reset = intent.getBooleanExtra(EXTRA_RESET, false)
            val demo = intent.getBooleanExtra(EXTRA_DEMO, false)
            lifecycleScope.launch {
                if (reset) model.repo.clear()
                if (demo) DemoData.seed(model)
                intent.dataString?.let(model::handleLink)
            }
        }
        lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) = model.startPolling()
            override fun onStop(owner: LifecycleOwner) = model.stopPolling()
        })
        setContent {
            PadelTheme {
                PadelNavHost(model)
            }
        }
    }

    /** americanoo://g/CODE?key=…, https://…/g/CODE (App Links), widget and notification taps. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.dataString?.let(model::handleLink)
    }

    companion object {
        const val EXTRA_RESET = "reset"
        const val EXTRA_DEMO = "demo"
    }
}
