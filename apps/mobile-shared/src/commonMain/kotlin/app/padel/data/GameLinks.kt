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

    private val linkRe = Regex("""(?:https?://\S+|$SCHEME://\S+)""")
    private val codeRe6 = Regex("(?<![A-Za-z0-9])[$ALPHABET]{6}(?![A-Za-z0-9])")
    /** Letter-spaced codes as OCR reads the share sheet's tracked font: "K 7 Q 2 M X". */
    private val spacedRe = Regex("(?<![A-Za-z0-9])([$ALPHABET])(?: ([$ALPHABET])){5}(?![A-Za-z0-9])")

    /**
     * Every game a scan might point to, most likely first. [text] is whatever was read from a
     * photo or the camera: QR payloads and/or recognised text (a screenshot of the share sheet,
     * a code on a whiteboard). Links win; then all-caps 6-character codes, preferring ones with a
     * digit or next to the word "code". Plain words that happen to fit ("COURTS") may appear, so
     * callers confirm with the server ([GameRepository.joinScanned]).
     */
    fun candidates(text: String): List<JoinTarget> {
        val out = linkedMapOf<String, JoinTarget>()
        linkRe.findAll(text).mapNotNull { parse(it.value.trimEnd('.', ',', ')', ']')) }.forEach { out.getOrPut(it.code) { it } }
        val codes = codeRe6.findAll(text).map { it.value to it.range.first } +
            spacedRe.findAll(text).map { it.value.replace(" ", "") to it.range.first }
        codes
            .sortedByDescending { (code, at) ->
                val labelled = text.substring(maxOf(0, at - 24), at).contains("code", ignoreCase = true)
                (if (code.any(Char::isDigit)) 2 else 0) + (if (labelled) 1 else 0)
            }
            .forEach { (code, _) -> out.getOrPut(code) { JoinTarget(code) } }
        return out.values.toList()
    }

    /** A target as input for [GameRepository.join]. */
    fun input(target: JoinTarget): String =
        target.organizerKey?.let { "$SCHEME://g/${target.code}?key=$it" } ?: target.code

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
