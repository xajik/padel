package app.americanoo.data

import app.americanoo.engine.Settings
import app.americanoo.engine.Side
import app.americanoo.engine.modeInfo
import kotlinx.serialization.Serializable

/** A group of players who played together before, with the settings of their latest game. */
data class RecentGroup(
    val name: String,
    val names: List<String>,
    val sides: List<Side>?,
    val settings: Settings,
    val lastPlayed: Long,
) {
    val modeName: String get() = modeInfo(settings.mode).name
}

/** The organizer key of one game, passed between a phone and its watch. */
@Serializable
data class GameKey(val code: String, val key: String)

/** Distinct player groups from [games], most recently played first (same names in any order count once). */
fun recentGroups(games: List<LocalGame>, limit: Int = 5): List<RecentGroup> = games
    .sortedByDescending { it.game.updatedAt }
    .distinctBy { g -> g.game.state.players.map { it.name.lowercase() }.sorted() }
    .take(limit)
    .map { g ->
        val players = g.game.state.players
        RecentGroup(
            name = g.game.name,
            names = players.map { it.name },
            sides = if (modeInfo(g.game.state.settings.mode).sides) players.map { it.side ?: Side.A } else null,
            settings = g.game.state.settings,
            lastPlayed = g.game.updatedAt,
        )
    }
