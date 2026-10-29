const {withMainActivity} = require('expo/config-plugins');

/** Retain the latest content intent while React starts or Android restores an existing task. */
module.exports = config => withMainActivity(config, mod => {
  if (mod.modResults.language !== 'kt') throw new Error('ONDA deep links require a Kotlin MainActivity.');
  let code = mod.modResults.contents;
  if (code.includes('// ONDA content intent')) return mod;
  if (code.includes('override fun onNewIntent(')) throw new Error('Review the existing MainActivity intent handler before adding ONDA deep links.');
  if (!code.includes('import android.content.Intent')) code = code.replace('import android.os.Build', 'import android.content.Intent\nimport android.os.Build');
  const anchor = '  override fun getMainComponentName()';
  if (!code.includes(anchor)) throw new Error('MainActivity template changed: missing component method.');
  code = code.replace(anchor, `  // ONDA content intent: Linking.getInitialURL must see the newest URI after process recreation.
  override fun onNewIntent(intent: Intent) {
    setIntent(intent)
    super.onNewIntent(intent)
  }

${anchor}`);
  mod.modResults.contents = code;
  return mod;
});
