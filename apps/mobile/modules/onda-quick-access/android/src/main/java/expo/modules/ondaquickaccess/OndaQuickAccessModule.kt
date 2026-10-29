package expo.modules.ondaquickaccess

import android.app.Activity
import expo.modules.kotlin.Promise
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.view.View
import android.widget.RemoteViews
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

/** No player, network request, tracking or periodic job. Only IDs and display names stay on-device. */
class OndaQuickAccessModule : Module() {
  private var exportPromise: Promise? = null
  private var exportContents: String? = null
  override fun definition() = ModuleDefinition {
    Name("OndaQuickAccess")
    AsyncFunction("saveBackup") { contents: String, filename: String, promise: Promise ->
      if (exportPromise != null || contents.toByteArray(Charsets.UTF_8).size > 5 * 1024 * 1024) {
        promise.reject("ERR_BACKUP_BUSY", "No se pudo abrir el respaldo.", null)
      } else {
        try {
          exportPromise = promise; exportContents = contents
          appContext.throwingActivity.startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE); type = "application/json"
            putExtra(Intent.EXTRA_TITLE, filename.take(80))
          }, 7031)
        } catch (e: Exception) {
          exportPromise = null; exportContents = null
          promise.reject("ERR_BACKUP_SAVE", "No se pudo abrir el selector de archivos.", e)
        }
      }
    }
    OnActivityResult { _, (requestCode, resultCode, intent) ->
      if (requestCode == 7031) {
        val promise = exportPromise; val contents = exportContents
        exportPromise = null; exportContents = null
        if (resultCode != Activity.RESULT_OK || intent?.data == null || contents == null) promise?.resolve(false)
        else Thread { try {
          val context = appContext.reactContext ?: throw IllegalStateException()
          val output = context.contentResolver.openOutputStream(intent.data!!, "wt") ?: throw IllegalStateException()
          output.use { it.write(contents.toByteArray(Charsets.UTF_8)) }
          promise?.resolve(true)
        } catch (e: Exception) { promise?.reject("ERR_BACKUP_SAVE", "No se pudo guardar el respaldo.", e) } }.apply { name = "ONDA-library-backup"; start() }
      }
    }
    AsyncFunction("update") { snapshot: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      if (snapshot.length > 4096) return@AsyncFunction
      val data = JSONObject(snapshot)
      context.getSharedPreferences("onda_quick_access", Context.MODE_PRIVATE).edit().putString("snapshot", snapshot).apply()
      OndaRadioWidget.updateAll(context)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
        val manager = context.getSystemService(ShortcutManager::class.java)
        if (!manager.isRateLimitingActive) {
          val favorites = data.optJSONArray("favorites")
          val shortcuts = (0 until minOf(favorites?.length() ?: 0, 3, manager.maxShortcutCountPerActivity)).map { index ->
            val station = favorites!!.getJSONObject(index)
            ShortcutInfo.Builder(context, "onda-" + station.getString("id"))
              .setShortLabel(station.getString("name").take(32)).setLongLabel("Escuchar " + station.getString("name").take(80))
              .setIcon(Icon.createWithResource(context, R.drawable.onda_shortcut_radio))
              .setIntent(OndaRadioWidget.launchIntent(context, "quick-play", station.getString("id"))).setRank(index).build()
          }
          val activeIds = shortcuts.map { it.id }.toSet()
          val removed = (manager.dynamicShortcuts + manager.pinnedShortcuts).map { it.id }.filter { it.startsWith("onda-") && it !in activeIds }.distinct()
          if (removed.isNotEmpty()) manager.disableShortcuts(removed, "Esta emisora ya no está en tus favoritas")
          if (activeIds.isNotEmpty()) manager.enableShortcuts(activeIds.toList())
          manager.dynamicShortcuts = shortcuts
        }
      }
    }
    AsyncFunction("requestWidget") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      val manager = AppWidgetManager.getInstance(context)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.isRequestPinAppWidgetSupported)
        manager.requestPinAppWidget(ComponentName(context, OndaRadioWidget::class.java), null, null)
      else false
    }
  }
}

class OndaRadioWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = updateAll(context)
  companion object {
    fun launchIntent(context: Context, path: String, stationId: String? = null): Intent {
      val uri = Uri.Builder().scheme("onda").authority(path).apply { if (stationId != null) appendQueryParameter("id", stationId) }.build()
      return context.packageManager.getLaunchIntentForPackage(context.packageName)!!.apply {
        action = Intent.ACTION_VIEW; data = uri
        // Content links must be delivered even when Android restores an existing launcher task.
        // This is a content deep link, including when reached from a launcher shortcut or widget.
        removeCategory(Intent.CATEGORY_LAUNCHER)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      }
    }
    private fun action(context: Context, path: String, id: String? = null) = PendingIntent.getActivity(context, 0,
      launchIntent(context, path, id), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, OndaRadioWidget::class.java))
      if (ids.isEmpty()) return
      val saved = context.getSharedPreferences("onda_quick_access", Context.MODE_PRIVATE).getString("snapshot", "{}")
      val favorites = try {JSONObject(saved ?: "{}").optJSONArray("favorites")} catch (_: Exception) {null}
      val views = RemoteViews(context.packageName, R.layout.onda_radio_widget)
      views.setOnClickPendingIntent(R.id.onda_widget_library, action(context, "library"))
      views.setOnClickPendingIntent(R.id.onda_widget_root, action(context, "library"))
      val rows = intArrayOf(R.id.onda_widget_favorite_0, R.id.onda_widget_favorite_1, R.id.onda_widget_favorite_2)
      rows.forEachIndexed { index, viewId ->
        val station = favorites?.optJSONObject(index)
        views.setViewVisibility(viewId, if (station != null || index == 0) View.VISIBLE else View.GONE)
        views.setTextViewText(viewId, station?.let { "▶  " + it.optString("name") } ?: "♡  Guarda tus radios favoritas")
        views.setContentDescription(viewId, station?.let { "Escuchar " + it.optString("name") } ?: "Abrir biblioteca y guardar favoritas")
        views.setOnClickPendingIntent(viewId, if (station != null) action(context, "quick-play", station.optString("id")) else action(context, "library"))
      }
      manager.updateAppWidget(ids, views)
    }
  }
}
