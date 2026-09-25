package app.padel.engine

import java.io.File

internal actual fun readFixture(name: String): String = File(FIXTURES_DIR, name).readText()
