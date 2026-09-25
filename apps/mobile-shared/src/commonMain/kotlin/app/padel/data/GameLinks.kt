package app.padel.data

import kotlin.native.ObjCName

/** A game to open: its join code and, for organizer links, the key that grants editing. */
data class JoinTarget(val code: String, val organizerKey: String? = null)

/**
 * Join codes and links, shared by QR scanning, pasted text, universal/app links and the
 * custom scheme. Matches apps/web/lib/games/code.ts.
 *
 *   K7Q2MX · https://…/g/K7Q2MX · https://…/g/K7Q2MX?key=… · https://…/join?code=K7Q2MX · padel://g/K7Q2MX?key=…
 */
@ObjCName("GameLinks")
object GameLinks {
    /** Without ambiguous characters 0 O 1 I L (FR-4.1). */
    const val ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    const val SCHEME = "padel"

    private val codeRe = Regex("^[$ALPHABET]{6}$")

    fun isValidCode(code: String): Boolean = codeRe.matches(code)

    /** Parses anything a user might scan or paste; null when no game code is in it. */
    fun parse(input: String): JoinTarget? {
        val text = input.trim()
        if (text.isEmpty()) return null
        val query = text.substringAfter('?', "").substringBefore('#')
        val params = query.split('&').filter { '=' in it }.associate { it.substringBefore('=') to decode(it.substringAfter('=')) }
        val key = params["key"]?.takeIf { it.isNotBlank() }

        val path = text.substringBefore('?').substringBefore('#').trimEnd('/')
        val fromPath = Regex("/g/([A-Za-z0-9]{6})(?:/[a-z]*)?$").find(path)?.groupValues?.get(1)
            ?: Regex("^$SCHEME://g/([A-Za-z0-9]{6})").find(path)?.groupValues?.get(1)
        val candidate = (fromPath ?: params["code"] ?: path.substringAfterLast('/')).uppercase()
        return if (isValidCode(candidate)) JoinTarget(candidate, key) else null
    }

    fun spectatorUrl(baseUrl: String, code: String) = "${baseUrl.trimEnd('/')}/g/$code"

    /** Opens the game with edit rights on the web or another phone. Share only with co-organizers. */
    fun organizerUrl(baseUrl: String, code: String, key: String) = "${spectatorUrl(baseUrl, code)}?key=$key"

    fun newCode(random: kotlin.random.Random = kotlin.random.Random): String =
        (1..6).map { ALPHABET[random.nextInt(ALPHABET.length)] }.joinToString("")

    private fun decode(s: String): String = buildString {
        var i = 0
        while (i < s.length) {
            val c = s[i]
            if (c == '%' && i + 2 < s.length) {
                append(s.substring(i + 1, i + 3).toInt(16).toChar()); i += 3
            } else {
                append(if (c == '+') ' ' else c); i++
            }
        }
    }
}
