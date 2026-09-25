package app.padel.data

import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.darwin.Darwin

internal actual fun defaultEngine(): HttpClientEngine = Darwin.create()
