package com.example.secss.ui

import android.app.Activity
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.provider.OpenableColumns
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

internal object UiComponents {
    val senaGreen = Color.rgb(57, 169, 0)
    val secssNavy = Color.rgb(0, 50, 77)
    const val maxImageSizeBytes = 5L * 1024 * 1024

    fun base(activity: Activity, title: String = ""): LinearLayout {
        val root = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(activity, 20), dp(activity, 18), dp(activity, 20), dp(activity, 28))
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(Color.WHITE, Color.rgb(241, 255, 244), Color.rgb(201, 245, 208))
            )
        }
        ScrollView(activity).apply {
            addView(root)
            activity.setContentView(this)
        }
        if (title.isNotEmpty()) {
            root.addView(label(activity, title).apply {
                textSize = 25f
                setTypeface(null, Typeface.BOLD)
                setTextColor(secssNavy)
                setPadding(0, 0, 0, dp(activity, 18))
            })
        }
        activity.window.statusBarColor = secssNavy
        activity.window.navigationBarColor = secssNavy
        return root
    }

    fun label(activity: Activity, text: String) = TextView(activity).apply {
        this.text = text
        textSize = 15f
        setTextColor(Color.rgb(33, 37, 41))
        setPadding(0, dp(activity, 6), 0, dp(activity, 6))
    }

    fun input(activity: Activity, hintText: String) = EditText(activity).apply {
        setSingleLine(true)
        textSize = 16f
        hint = hintText
        setTextColor(Color.rgb(33, 37, 41))
        setPadding(dp(activity, 12), dp(activity, 8), dp(activity, 12), dp(activity, 8))
        layoutParams = LinearLayout.LayoutParams(-1, -2).apply {
            setMargins(0, dp(activity, 5), 0, dp(activity, 5))
        }
    }

    fun button(activity: Activity, text: String) = Button(activity).apply {
        this.text = text
        isAllCaps = false
        setTextColor(Color.WHITE)
        backgroundTintList = ColorStateList.valueOf(senaGreen)
        layoutParams = LinearLayout.LayoutParams(-1, -2).apply {
            setMargins(0, dp(activity, 8), 0, dp(activity, 4))
        }
    }

    fun rounded(activity: Activity, color: Int, stroke: Int) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(activity, 16).toFloat()
        setStroke(dp(activity, 1), stroke)
    }

    fun dp(activity: Activity, value: Int): Int =
        (value * activity.resources.displayMetrics.density + 0.5f).toInt()

    fun toast(activity: Activity, message: String) {
        Toast.makeText(activity, message, Toast.LENGTH_LONG).show()
    }

    fun imageSizeBytes(activity: Activity, uri: Uri): Long? =
        activity.contentResolver.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null).use { cursor ->
            if (cursor == null || !cursor.moveToFirst()) {
                null
            } else {
                val index = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (index < 0 || cursor.isNull(index)) null else cursor.getLong(index)
            }
        }
}
