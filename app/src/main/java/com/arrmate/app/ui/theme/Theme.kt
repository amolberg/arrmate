package com.arrmate.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColors = darkColorScheme(
    primary = Color(0xFF6EE7B7),
    onPrimary = Color(0xFF00382A),
    secondary = Color(0xFFF6C177),
    background = Color(0xFF081713),
    surface = Color(0xFF10231D),
    surfaceVariant = Color(0xFF1A3029),
    onBackground = Color(0xFFE4F1EA),
    onSurface = Color(0xFFE4F1EA),
    error = Color(0xFFFFB4AB),
)

private val LightColors = lightColorScheme(
    primary = Color(0xFF006C51),
    onPrimary = Color.White,
    secondary = Color(0xFF855400),
    background = Color(0xFFF4FBF7),
    surface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFDDECE4),
    onBackground = Color(0xFF17211D),
    onSurface = Color(0xFF17211D),
)

@Composable
fun ArrmateTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val context = LocalContext.current
    val colors = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && dark -> dynamicDarkColorScheme(context)
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> dynamicLightColorScheme(context)
        dark -> DarkColors
        else -> LightColors
    }
    MaterialTheme(colorScheme = colors, content = content)
}
