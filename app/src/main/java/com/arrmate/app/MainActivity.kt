package com.arrmate.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.arrmate.app.ui.ArrmateApp
import com.arrmate.app.ui.theme.ArrmateTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ArrmateTheme {
                ArrmateApp(repository = (application as ArrmateApplication).repository)
            }
        }
    }
}
