package app.padel.engine

import kotlin.random.Random

/**
 * Deterministic PRNG, bit-identical to packages/engine/src/rng.ts, so the same seed yields the
 * same schedule on web, Worker and mobile. Kotlin `Int` arithmetic wraps like `Math.imul` / `| 0`.
 */
fun interface Rng {
    fun next(): Double
}

/** xmur3 string hash → 32-bit seed (iterates UTF-16 code units, like `charCodeAt`). */
private fun hash(str: String): Int {
    var h = 1779033703 xor str.length
    for (ch in str) {
        h = (h xor ch.code) * 3432918353L.toInt()
        h = (h shl 13) or (h ushr 19)
    }
    h = (h xor (h ushr 16)) * 2246822507L.toInt()
    h = (h xor (h ushr 13)) * 3266489909L.toInt()
    return h xor (h ushr 16)
}

/** mulberry32 */
fun createRng(seed: String): Rng {
    var a = hash(seed)
    return Rng {
        a += 0x6d2b79f5
        var t = a
        t = (t xor (t ushr 15)) * (t or 1)
        t = t xor (t + (t xor (t ushr 7)) * (t or 61))
        (t xor (t ushr 14)).toUInt().toDouble() / 4294967296.0
    }
}

/** Fisher–Yates shuffle returning a new list. */
fun <T> shuffle(items: List<T>, rng: Rng): List<T> {
    val out = items.toMutableList()
    for (i in out.size - 1 downTo 1) {
        val j = (rng.next() * (i + 1)).toInt()
        val tmp = out[i]
        out[i] = out[j]
        out[j] = tmp
    }
    return out
}

fun randomSeed(): String {
    val alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    return (1..8).map { alphabet[Random.nextInt(alphabet.length)] }.joinToString("")
}
