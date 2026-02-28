import 'nextra-theme-docs/style.css'
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Script from 'next/script'
import { DocsAnalyticsForwarder } from '../components/docs-analytics-forwarder'
import { DocsPageviewTracker } from '../components/docs-pageview-tracker'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

export default function DocsApp({ Component, pageProps }: AppProps) {
  return (
    <main className="font-body tracking-tight" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <DocsAnalyticsForwarder />
      <DocsPageviewTracker />

      {/* Google Analytics */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {/* PostHog */}
      {POSTHOG_KEY && (
        <Script id="posthog-init" strategy="afterInteractive">
          {`(function(){
  var c=document.cookie;
  if(/ph_optout/.test(location.search)){document.cookie='fd_optout=1;max-age=31536000;path=/';return;}
  if(/ph_optin/.test(location.search)){document.cookie='fd_optout=;max-age=0;path=/';}
  if(/fd_optout=1/.test(c))return;
  var h=location.hostname;
  if(h==='localhost'||h==='127.0.0.1'||h==='0.0.0.0'||h.endsWith('.local'))return;
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init('${POSTHOG_KEY}',{
    api_host:'/ingest',
    ui_host:'${POSTHOG_HOST}',
    person_profiles:'identified_only',
    capture_pageview:true,
    capture_pageleave:true,
    autocapture:{element_allowlist:['a','button'],css_selector_allowlist:['.fd-cta-primary','.fd-cta-secondary','[data-ph]']},
    disable_session_recording:false,
    persistence:'localStorage+cookie',
    loaded:function(ph){
      if(typeof window!=='undefined'){
        var _prev=location.href;
        new MutationObserver(function(){if(location.href!==_prev){_prev=location.href;ph.capture('$pageview');}}).observe(document.body,{childList:true,subtree:true});
      }
    }
  });
})()`}
        </Script>
      )}

      <Component {...pageProps} />
    </main>
  )
}
