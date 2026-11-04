import {defineConfig, loadEnv} from 'vite';

// Development uses the same real Apps Script bridge as GitHub Pages.
// V10 deliberately has no preview OTP/mock backend.
export default defineConfig(({mode}) => {
  const fileEnv=loadEnv(mode,process.cwd(),'INCENTIFY_');
  const url=String(process.env.INCENTIFY_ERP_API_URL||fileEnv.INCENTIFY_ERP_API_URL||'').trim();
  const valid=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url);
  if (!valid || url.includes('PASTE_') || url.includes('YOUR_')) {
    throw new Error('INCENTIFY ERP V10 requires a real Apps Script /exec URL in .env.local for dev or the Actions repository variable for Pages.');
  }
  return {
    base:'./',
    server:{host:'127.0.0.1',port:5173,strictPort:true},
    build:{rollupOptions:{input:['index.html','admin-login.html','sales-login.html','erp.html','admin.html']}},
    plugins:[{name:'incentify-v10-live-only',transformIndexHtml(html){
      const anchor='<script src="js/bridge-client.js"></script>';
      const inject='<script>window.INCENTIFY_CONFIG=Object.freeze({...window.INCENTIFY_CONFIG,API_URL:'+JSON.stringify(url)+',BRIDGE_URL:'+JSON.stringify(url+'?bridge=1')+'})</script>';
      if(!html.includes(anchor))throw new Error('Bridge bootstrap missing from HTML');
      return html.replace(anchor,inject+anchor);
    }}]
  };
});
