package app.americanoo.data

import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/** Platform HTTP engine (Darwin on iOS, OkHttp on Android/JVM). */
internal expect fun defaultEngine(): HttpClientEngine

internal val PadelJson = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
    // The web engine treats a missing score as "scored" (undefined !== null), so nulls must be sent.
    explicitNulls = true
    classDiscriminator = "type"
}

/**
 * The cloud game API served by the web Worker (proxied to apps/mcp), the same endpoints the
 * web app and AI agents use, so a game is one game everywhere.
 */
class PadelApi internal constructor(val baseUrl: String, engine: HttpClientEngine) {
    constructor(baseUrl: String) : this(baseUrl, defaultEngine())

    private val http = HttpClient(engine) {
        expectSuccess = false
        install(ContentNegotiation) { json(PadelJson) }
        install(HttpTimeout) {
            requestTimeoutMillis = 15_000
            connectTimeoutMillis = 10_000
        }
        defaultRequest { url(baseUrl.trimEnd('/') + "/") }
    }

    internal suspend fun create(request: CreateGameRequest): CreatedGame =
        http.post("api/v1/games") {
            contentType(ContentType.Application.Json)
            setBody(request)
        }.decode()

    /** Null when no game has that code (or it expired). */
    internal suspend fun fetch(code: String): StoredGame? {
        val res = http.get("api/games/$code")
        if (res.status.value == 404) return null
        return res.decode<GameEnvelope>().game
    }

    internal suspend fun redeem(code: String, key: String): Boolean =
        http.post("api/games/$code/redeem") { header("X-Organizer-Key", key) }.decode<RedeemResponse>().editor

    internal suspend fun mutate(code: String, key: String, mutation: CloudMutation): MutateResponse =
        http.post("api/games/$code/mutate") {
            header("X-Organizer-Key", key)
            contentType(ContentType.Application.Json)
            setBody(PadelJson.encodeToString(CloudMutation.serializer(), mutation))
        }.decode()

    private suspend inline fun <reified T> HttpResponse.decode(): T {
        val text = bodyAsText()
        if (!status.isSuccess()) {
            val err = runCatching { PadelJson.decodeFromString<ErrorEnvelope>(text).error }.getOrNull()
            throw ApiException(err?.code ?: "HTTP_${status.value}", err?.message ?: "The game server returned ${status.value}.", status.value)
        }
        return PadelJson.decodeFromString(text)
    }
}
