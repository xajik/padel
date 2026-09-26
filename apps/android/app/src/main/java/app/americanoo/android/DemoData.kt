package app.americanoo.android

/** `demo` intent extra: realistic games for Play Store screenshots (same as iOS DemoData). */
object DemoData {
    suspend fun seed(model: AppViewModel) {
        app.americanoo.data.DemoData.seed(model.repo)?.let { model.message.value = "Demo data: $it" }
    }
}
