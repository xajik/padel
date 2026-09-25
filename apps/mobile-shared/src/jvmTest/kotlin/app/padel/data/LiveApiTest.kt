package app.padel.data

import app.padel.engine.ModeId
import app.padel.engine.defaultSettings
import kotlinx.coroutines.runBlocking
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Talks to a real deployment, so a phone game and the web see the same thing.
 * Opt-in: PADEL_LIVE_URL=https://padel-web.xajik0.workers.dev ./gradlew jvmTest
 */
class LiveApiTest {
    private val base = System.getenv("PADEL_LIVE_URL")

    @Test
    fun phoneGameIsVisibleAndEditableFromTheWeb() = runBlocking {
        if (base.isNullOrBlank()) return@runBlocking
        val phone = GameRepository(PadelApi(base), MemoryStore())
        val g = phone.create("Live check (mobile)", defaultSettings(ModeId.Mexicano, 8), listOf("Anna", "Mikko", "Laura", "Jussi", "Sara", "Pekka", "Emma", "Olli"))
        assertTrue(!g.needsCreate && g.organizerKey != null, "registered with the server")
        println("LIVE game ${g.code} ${GameLinks.organizerUrl(base, g.code, g.organizerKey!!)}")

        g.game.state.rounds[0].matches.indices.forEach { phone.score(g.code, 0, it, 16, null) }
        phone.next(g.code)
        phone.sync(g.code)

        // What the web app loads for /g/{code}.
        val web = HttpClient.newHttpClient()
        val json = web.send(HttpRequest.newBuilder(URI("$base/api/games/${g.code}")).build(), HttpResponse.BodyHandlers.ofString()).body()
        val remote = PadelJson.decodeFromString(GameEnvelope.serializer(), json).game
        assertEquals(phone.game(g.code)!!.game.state, remote.state)
        assertEquals(1, remote.state.current)
        val page = web.send(HttpRequest.newBuilder(URI("$base/g/${g.code}")).build(), HttpResponse.BodyHandlers.discarding())
        assertEquals(200, page.statusCode())

        // A second device joins with the organizer link and sees the same round.
        val other = GameRepository(PadelApi(base), MemoryStore())
        val joined = other.join(GameLinks.organizerUrl(base, g.code, g.organizerKey!!))
        assertTrue(joined.canEdit)
        assertEquals(remote.state, joined.game.state)
    }
}
