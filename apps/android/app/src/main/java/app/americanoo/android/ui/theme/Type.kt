package app.americanoo.android.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import app.americanoo.android.R

// Geist is a variable font: one file, a weight axis per style.
@OptIn(ExperimentalTextApi::class)
private fun geist(weight: FontWeight, res: Int = R.font.geist) =
    Font(res, weight, variationSettings = FontVariation.Settings(FontVariation.weight(weight.weight)))

val Geist = FontFamily(
    geist(FontWeight.Normal),
    geist(FontWeight.Medium),
    geist(FontWeight.SemiBold),
    geist(FontWeight.Bold),
)

val GeistMono = FontFamily(
    geist(FontWeight.Normal, R.font.geist_mono),
    geist(FontWeight.SemiBold, R.font.geist_mono),
)

/** Tabular figures for scores and standings, so columns don't jitter while numbers change. */
val TabularNums = TextStyle(fontFeatureSettings = "tnum")

private fun style(size: TextUnit, weight: FontWeight = FontWeight.Normal) =
    TextStyle(fontFamily = Geist, fontSize = size, fontWeight = weight)

val PadelTypography = Typography(
    displayLarge = style(FontSize.xl5, FontWeight.Bold),
    displayMedium = style(FontSize.xl4, FontWeight.Bold),
    displaySmall = style(FontSize.xl3, FontWeight.Bold),
    headlineLarge = style(FontSize.xl3, FontWeight.Bold),
    headlineMedium = style(FontSize.xl2, FontWeight.SemiBold),
    headlineSmall = style(FontSize.xl, FontWeight.SemiBold),
    titleLarge = style(FontSize.lg, FontWeight.SemiBold),
    titleMedium = style(FontSize.base, FontWeight.SemiBold),
    titleSmall = style(FontSize.sm, FontWeight.SemiBold),
    bodyLarge = style(FontSize.base),
    bodyMedium = style(FontSize.sm),
    bodySmall = style(FontSize.xs),
    labelLarge = style(FontSize.base, FontWeight.SemiBold),
    labelMedium = style(FontSize.sm, FontWeight.Medium),
    labelSmall = style(FontSize.xs, FontWeight.Medium),
)
