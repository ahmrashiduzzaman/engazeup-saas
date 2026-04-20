# -*- coding: utf-8 -*-
import sys
import os

path = r'd:\SAAS\EngazeUp\src\pages\IntegrationsPage.tsx'

with open(path, encoding='utf-8') as f:
    content = f.read()

# Normalize to LF
content = content.replace('\r\n', '\n')

# Find the function by line range and replace lines 105-146 (0-indexed: 104-145)
lines = content.split('\n')

# Find start and end of old function
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if 'const fetchFacebookPages = async () =>' in line and start_idx is None:
        start_idx = i
    if start_idx is not None and i > start_idx and line.strip() == '};':
        end_idx = i
        break

print(f"Found function at lines {start_idx+1} to {end_idx+1}")

new_func_lines = [
'  const fetchFacebookPages = async () => {',
'    setIsFetchingPages(true);',
'    try {',
'      const { data: { session } } = await supabase.auth.getSession();',
'      const providerToken = session?.provider_token;',
'',
'      if (!providerToken) {',
"        toast.error('\u09a8\u09a4\u09c1\u09a8 \u099f\u09cb\u0995\u09c7\u09a8 \u09aa\u09cd\u09b0\u09af\u09bc\u09cb\u099c\u09a8\u0964 \u09ab\u09c7\u09b8\u09ac\u09c1\u0995\u09c7 \u09b2\u0997\u0987\u09a8 \u0995\u09b0\u09be \u09b9\u099a\u09cd\u099b\u09c7...');",
'        await triggerFacebookLogin();',
'        return;',
'      }',
'',
"      // \u2705 Edge Function-\u098f\u09b0 \u09ae\u09be\u09a7\u09cd\u09af\u09ae\u09c7 Long-Lived Token \u2014 FACEBOOK_APP_ID \u0993 APP_SECRET Supabase Secrets-\u098f",
"      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://otvzexarrpuaewjjdxna.supabase.co';",
"      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';",
'',
'      const response = await fetch(`${supabaseUrl}/functions/v1/fb-token-exchange`, {',
"        method: 'POST',",
'        headers: {',
"          'Content-Type': 'application/json',",
'          \'Authorization\': `Bearer ${anonKey}`,',
'        },',
'        body: JSON.stringify({ provider_token: providerToken }),',
'      });',
'',
'      const data = await response.json();',
'',
'      if (!response.ok || data.error) {',
"        const errMsg = data.error || 'Token exchange failed';",
'        if (',
"          errMsg.toLowerCase().includes('expired') ||",
"          errMsg.toLowerCase().includes('invalid') ||",
"          errMsg.toLowerCase().includes('oauth')",
'        ) {',
"          toast.error('\u09b8\u09c7\u09b6\u09a8 \u098f\u0995\u09cd\u09b8\u09aa\u09be\u09af\u09bc\u09be\u09b0 \u09b9\u09af\u09bc\u09c7\u099b\u09c7! \u09aa\u09c1\u09a8\u09b0\u09be\u09af\u09bc \u09b2\u0997\u0987\u09a8 \u0995\u09b0\u09be \u09b9\u099a\u09cd\u099b\u09c7...');",
'          await triggerFacebookLogin();',
'          return;',
'        }',
'        throw new Error(errMsg);',
'      }',
'',
'      const pages: FacebookPage[] = data.pages ?? [];',
'      setFbPages(pages);',
'',
'      if (pages.length === 0) {',
"        toast.error('\u0986\u09aa\u09a8\u09be\u09b0 \u0985\u09cd\u09af\u09be\u0995\u09be\u0989\u09a8\u09cd\u099f\u09c7 \u0995\u09cb\u09a8\u09cb \u09ab\u09c7\u09b8\u09ac\u09c1\u0995 \u09aa\u09c7\u099c \u09aa\u09be\u0993\u09af\u09bc\u09be \u09af\u09be\u09af\u09bc\u09a8\u09bf\u0964');",
'      } else {',
"        toast.success(`\u2705 ${pages.length} \u099f\u09bf \u09aa\u09c7\u099c \u09aa\u09be\u0993\u09af\u09bc\u09be \u0997\u09c7\u099b\u09c7! (Long-Lived Token \u09b8\u09b9)`);",
'      }',
'    } catch (err: any) {',
"      console.error('FB Fetch Error:', err);",
"      toast.error('\u09aa\u09c7\u099c \u0986\u09a8\u09a4\u09c7 \u09b8\u09ae\u09b8\u09cd\u09af\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7: ' + err.message);",
'    } finally {',
'      setIsFetchingPages(false);',
'    }',
'  };',
]

new_lines = lines[:start_idx] + new_func_lines + lines[end_idx+1:]
new_content = '\n'.join(new_lines)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(new_content)

print(f"Done! File updated. New total lines: {len(new_lines)}")
