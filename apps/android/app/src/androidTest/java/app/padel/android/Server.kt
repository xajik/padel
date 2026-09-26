package app.padel.android

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Direct calls to the deployed API, standing in for the web app / an AI agent. */
object Server {
    val BASE: String = PadelApplication.BASE_URL

    fun request(path: String, method: String = "GET", body: JSONObject? = null, key: String? = null): JSONObject {
        val c = URL("$BASE/$path").openConnection() as HttpURLConnection
        c.requestMethod = method
        key?.let { c.setRequestProperty("X-Organizer-Key", it) }
        if (body != null) {
            c.doOutput = true
            c.setRequestProperty("Content-Type", "application/json")
            c.outputStream.use { it.write(body.toString().toByteArray()) }
        }
        val stream = if (c.responseCode < 400) c.inputStream else c.errorStream
        return JSONObject(stream.bufferedReader().readText())
    }

    fun create(name: String): Pair<String, String> {
        val body = JSONObject().put("mode", "americano").put("courts", 2).put("name", name)
            .put("names", org.json.JSONArray(listOf("Anna", "Mikko", "Laura", "Jussi", "Sara", "Pekka", "Emma", "Olli")))
        val g = request("api/v1/games", "POST", body)
        return g.getString("code") to g.getString("organizerKey")
    }

    fun game(code: String): JSONObject = request("api/games/$code").getJSONObject("game")

    fun waitFor(code: String, timeoutMs: Long = 20_000, until: (JSONObject) -> Boolean): JSONObject {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            val g = game(code)
            if (until(g)) return g
            Thread.sleep(1_000)
        }
        throw AssertionError("Server never reached the expected state for $code")
    }

    fun scoreA(g: JSONObject, round: Int, match: Int): Int? {
        val m = g.getJSONObject("state").getJSONArray("rounds").getJSONObject(round).getJSONArray("matches").getJSONObject(match)
        return if (m.isNull("scoreA")) null else m.getInt("scoreA")
    }
}
