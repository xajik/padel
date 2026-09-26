package app.americanoo.android

import app.americanoo.data.GameRepository
import app.americanoo.data.GameSetup
import app.americanoo.engine.ModeId
import app.americanoo.engine.ScoringType

/** `demo` intent extra: realistic games for Play Store screenshots (same as iOS DemoData). */
object DemoData {
    private val scores = listOf(15, 11, 17, 13, 9, 16)

    suspend fun seed(model: AppViewModel) {
        seed(model.repo)?.let { model.message.value = "Demo data: $it" }
    }

    /** Returns an error message, or null when both games are ready. */
    suspend fun seed(repo: GameRepository): String? {
        try {
            val done = repo.create(
                "Sunday Mexicano",
                GameSetup.settings(ModeId.Mexicano, 8, 2, ScoringType.Total, 24, 3, false),
                listOf("Iida", "Timo", "Nea", "Eero", "Ella", "Juho", "Siiri", "Aku"),
            )
            for (r in 0 until 3) {
                scoreRound(repo, done.code, r, r + 3)
                if (r < 2) repo.next(done.code)
            }
            repo.finish(done.code)

            val live = repo.create(
                "Tuesday Club Night",
                GameSetup.settings(ModeId.Americano, 8, 2, ScoringType.Total, 24, null, false),
                listOf("Anna", "Mikko", "Laura", "Jussi", "Sara", "Pekka", "Emma", "Olli"),
            )
            for (r in 0 until 2) {
                scoreRound(repo, live.code, r, r)
                repo.next(live.code)
            }
            repo.score(live.code, 2, 0, 15, null)
            repo.syncAll()
            return null
        } catch (e: Exception) {
            return e.message ?: e.toString()
        }
    }

    private suspend fun scoreRound(repo: GameRepository, code: String, round: Int, seed: Int) {
        val matches = repo.game(code)!!.game.state.rounds[round].matches.size
        for (m in 0 until matches) repo.score(code, round, m, scores[(seed + m) % scores.size], null)
    }
}
