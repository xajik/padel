package app.americanoo.android.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Token colours that Material's scheme has no slot for (surface vs muted vs border as on the web).
 * Read via `PadelTheme.colors`.
 */
@Immutable
data class PadelColors(
    val background: Color,
    val foreground: Color,
    val surface: Color,
    val muted: Color,
    val mutedForeground: Color,
    val border: Color,
    val primary: Color,
    val primaryForeground: Color,
)

private val Light = PadelColors(
    LightPalette.background, LightPalette.foreground, LightPalette.surface, LightPalette.muted,
    LightPalette.mutedForeground, LightPalette.border, LightPalette.primary, LightPalette.primaryForeground,
)
private val Dark = PadelColors(
    DarkPalette.background, DarkPalette.foreground, DarkPalette.surface, DarkPalette.muted,
    DarkPalette.mutedForeground, DarkPalette.border, DarkPalette.primary, DarkPalette.primaryForeground,
)

/** Monochrome Material scheme: no dynamic colour, colour only for functional state (error). */
private fun PadelColors.toScheme(dark: Boolean): ColorScheme {
    val base = if (dark) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = primary,
        onPrimary = primaryForeground,
        primaryContainer = muted,
        onPrimaryContainer = foreground,
        secondary = foreground,
        onSecondary = background,
        secondaryContainer = muted,
        onSecondaryContainer = foreground,
        tertiary = foreground,
        onTertiary = background,
        background = background,
        onBackground = foreground,
        surface = background,
        onSurface = foreground,
        surfaceVariant = muted,
        onSurfaceVariant = mutedForeground,
        surfaceContainerLowest = background,
        surfaceContainerLow = surface,
        surfaceContainer = surface,
        surfaceContainerHigh = muted,
        surfaceContainerHighest = muted,
        outline = border,
        outlineVariant = border,
        error = StateColors.error,
        surfaceTint = Color.Transparent,
    )
}

private val LocalPadelColors = staticCompositionLocalOf { Light }

object PadelTheme {
    val colors: PadelColors
        @Composable get() = LocalPadelColors.current
}

@Composable
fun PadelTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (dark) Dark else Light
    CompositionLocalProvider(LocalPadelColors provides colors) {
        MaterialTheme(
            colorScheme = colors.toScheme(dark),
            typography = PadelTypography,
            shapes = Shapes(
                small = RoundedCornerShape(Radius.sm),
                medium = RoundedCornerShape(Radius.md),
                large = RoundedCornerShape(Radius.lg),
                extraLarge = RoundedCornerShape(Radius.xl),
            ),
            content = content,
        )
    }
}
