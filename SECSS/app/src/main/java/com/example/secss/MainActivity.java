package com.example.secss;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Build;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.widget.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private static final int SENA_GREEN = Color.rgb(57, 169, 0);
    private static final int SENA_GREEN_DARK = Color.rgb(46, 133, 0);
    private static final int SECSS_NAVY = Color.rgb(0, 50, 77);
    private static final int SECSS_LIGHT = Color.rgb(242, 244, 247);
    // API propia de SECSS en el puerto configurado para esta instalación.
    private static String apiBase() {
        boolean emulator = Build.FINGERPRINT.startsWith("generic") || Build.MODEL.contains("Emulator") || Build.HARDWARE.contains("ranchu");
        return (emulator ? "http://10.0.2.2:4001/api" : "http://127.0.0.1:4001/api");
    }
    private static final String PREFS = "secss_session";
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private LinearLayout root;
    private String token = "";
    private String role = "";
    private String username = "";
    private JSONArray vehicles = new JSONArray();
    private EditText documentField, passwordField;
    private final Map<String, Uri> selectedImages = new HashMap<>();
    private String pendingImageField;
    private TextView pendingImageLabel;
    private static final int PICK_IMAGE = 21;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(SECSS_NAVY);
        getWindow().setNavigationBarColor(SECSS_NAVY);
        SharedPreferences p = getSharedPreferences(PREFS, MODE_PRIVATE);
        token = p.getString("token", ""); role = p.getString("role", ""); username = p.getString("username", "");
        if (token.isEmpty()) showLogin(); else showHome();
    }

    private void base(String title) {
        ScrollView scroll = new ScrollView(this);
        root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(18), dp(20), dp(28));
        root.setBackground(new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                new int[]{Color.WHITE, Color.rgb(241,255,244), Color.rgb(201,245,208)}));
        scroll.addView(root); setContentView(scroll);
        if (title != null && !title.isEmpty()) {
            TextView heading = new TextView(this); heading.setText(title); heading.setTextSize(25);
            heading.setTypeface(null, Typeface.BOLD); heading.setTextColor(SECSS_NAVY);
            heading.setPadding(0,0,0,dp(18)); root.addView(heading);
        }
    }

    private void showLogin() {
        base("");
        ImageView cover = new ImageView(this);
        cover.setImageResource(R.drawable.secss_cover);
        cover.setScaleType(ImageView.ScaleType.FIT_CENTER);
        cover.setContentDescription("Portada SECSS SENA Parqueadero");
        cover.setBackground(rounded(SECSS_NAVY, SECSS_NAVY));
        cover.setPadding(dp(8), dp(8), dp(8), dp(8));
        root.addView(cover, new LinearLayout.LayoutParams(-1, dp(205)));
        TextView title = label("Bienvenidos a SECSS"); title.setTextSize(24); title.setTypeface(null, Typeface.BOLD);
        title.setTextColor(SECSS_NAVY); title.setGravity(Gravity.CENTER); title.setPadding(0,dp(14),0,dp(2)); root.addView(title);
        TextView intro = label("Servicio de Estacionamiento del Complejo Sur SENA");
        intro.setGravity(Gravity.CENTER); intro.setTextColor(Color.rgb(80, 88, 92)); intro.setPadding(0,0,0,dp(16)); root.addView(intro);
        LinearLayout loginCard = new LinearLayout(this); loginCard.setOrientation(LinearLayout.VERTICAL);
        loginCard.setPadding(dp(18),dp(16),dp(18),dp(18)); loginCard.setBackground(rounded(Color.WHITE, Color.rgb(220,226,229)));
        root.addView(loginCard, new LinearLayout.LayoutParams(-1,-2));
        TextView loginTitle = label("Iniciar sesión"); loginTitle.setTextSize(20); loginTitle.setTypeface(null,Typeface.BOLD);
        loginTitle.setTextColor(SECSS_NAVY); loginCard.addView(loginTitle);
        documentField = input("Número de documento"); documentField.setInputType(2); loginCard.addView(documentField);
        passwordField = input("Contraseña"); passwordField.setInputType(129); loginCard.addView(passwordField);
        Button enter = button("Ingresar"); loginCard.addView(enter);
        enter.setOnClickListener(v -> {
            String doc=documentField.getText().toString().trim(), pass=passwordField.getText().toString();
            if(doc.isEmpty()||pass.isEmpty()){ toast("Ingresa tu documento y contraseña."); return; }
            enter.setEnabled(false); enter.setText("Conectando…");
            request("POST", "/auth/storeAuthLogin", json("numero_documento",doc,"password",pass), null,
                result -> {
                    enter.setEnabled(true); enter.setText("Ingresar");
                    try {
                        token=result.getString("token"); JSONObject user=result.getJSONObject("usuario");
                        username=user.optString("nombre", "Usuario SECSS");
                        JSONArray roles=user.optJSONArray("roles"); role=roles!=null&&roles.length()>0?roles.getString(0):"";
                        getSharedPreferences(PREFS,MODE_PRIVATE).edit().putString("token",token).putString("role",role).putString("username",username).apply();
                        hideKeyboard(); showHome();
                    } catch(Exception e){ toast("Respuesta de inicio de sesión no válida."); }
                }, error -> { enter.setEnabled(true); enter.setText("Ingresar"); toast(error); });
        });
    }

    private void showHome() {
        base("");
        LinearLayout brand = new LinearLayout(this); brand.setOrientation(LinearLayout.VERTICAL);
        brand.setPadding(dp(18),dp(18),dp(18),dp(18)); brand.setBackground(rounded(SECSS_NAVY, SECSS_NAVY));
        TextView brandTitle=label("SECSS"); brandTitle.setTextSize(26); brandTitle.setTypeface(null,Typeface.BOLD); brandTitle.setTextColor(Color.WHITE); brand.addView(brandTitle);
        TextView brandSub=label("Sistema de Gestión y Control Tecnológico · CEET"); brandSub.setTextColor(Color.rgb(230,240,244)); brand.addView(brandSub);
        root.addView(brand, new LinearLayout.LayoutParams(-1,-2));
        TextView welcome=label("Bienvenida, "+(username.isEmpty()?"usuario":username));
        welcome.setTextSize(20); welcome.setTypeface(null,Typeface.BOLD); welcome.setTextColor(SECSS_NAVY); welcome.setPadding(0,dp(18),0,dp(4)); root.addView(welcome);
        TextView description=label("Servicio de Estacionamiento del Complejo Sur SENA");
        description.setTextColor(Color.rgb(80,88,92)); description.setPadding(0,0,0,dp(18)); root.addView(description);
        LinearLayout card=new LinearLayout(this); card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(18),dp(16),dp(18),dp(16)); card.setBackground(rounded(Color.WHITE, Color.rgb(220,226,229)));
        root.addView(card,new LinearLayout.LayoutParams(-1,-2));
        TextView title=label("Vehículos"); title.setTextSize(20); title.setTypeface(null,Typeface.BOLD); title.setTextColor(SECSS_NAVY); card.addView(title);
        card.addView(label("Registra y consulta motos y bicicletas asociadas a tu cuenta SECSS."));
        Button open=button("Abrir módulo Vehículos"); card.addView(open); open.setOnClickListener(v->loadVehicles());
        Button logout=button("Cerrar sesión"); root.addView(logout); logout.setOnClickListener(v->{getSharedPreferences(PREFS,MODE_PRIVATE).edit().clear().apply();token="";role="";username="";showLogin();});
    }
    private void loadVehicles() {
        base("Mis vehículos");
        TextView subtitle=label("SECSS · Módulo Vehículos"); root.addView(subtitle);
        TextView loading=label("Cargando vehículos…"); root.addView(loading);
        request("GET","/vehicle/me",null,token,result->{
            try { vehicles=result.optJSONArray("datos"); if(vehicles==null)vehicles=new JSONArray(); renderVehicles(); }
            catch(Exception e){ toast("No se pudieron leer los vehículos."); }
        },error->{ loading.setText(error); Button retry=button("Reintentar"); root.addView(retry); retry.setOnClickListener(v->loadVehicles()); });
    }

    private void renderVehicles() {
        base("Mis vehículos");
        TextView subtitle=label("Consulta, registra y administra tus vehículos."); root.addView(subtitle);
        if(role.equals("APRENDIZ")) { Button add=button("＋ Registrar vehículo"); root.addView(add); add.setOnClickListener(v->showVehicleForm(null)); }
        if(vehicles.length()==0){ TextView empty=label("Aún no tienes vehículos registrados."); empty.setPadding(0,dp(22),0,dp(10)); root.addView(empty); }
        for(int i=0;i<vehicles.length();i++) {
            JSONObject item=vehicles.optJSONObject(i); if(item==null)continue;
            LinearLayout card=new LinearLayout(this); card.setOrientation(LinearLayout.VERTICAL); card.setPadding(dp(15),dp(14),dp(15),dp(14));
            card.setBackground(rounded(Color.WHITE, Color.rgb(220,226,229))); LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(-1,-2); cp.setMargins(0,dp(10),0,0); root.addView(card,cp);
            String type=item.optString("tipo_vehiculo"); JSONObject detail=item.optJSONObject("detalles"); if(detail==null)detail=new JSONObject();
            String ident=type.equals("MOTO")?detail.optString("placa"):detail.optString("numero_marco");
            TextView name=label((type.equals("MOTO")?"Motocicleta":"Bicicleta")+" · "+(ident.isEmpty()?"Sin identificador":ident)); name.setTypeface(null,Typeface.BOLD); card.addView(name);
            card.addView(label("Marca: "+item.optString("marca","—")+"     Color: "+item.optString("color","—")));
            String spec=type.equals("MOTO")?detail.optString("cilindraje")+" c.c. · Modelo "+detail.optString("modelo"):detail.optString("clase_bicicleta");
            card.addView(label("Detalle: "+spec));
            int quota=item.optInt("estado_cupo",0); card.addView(label("Cupo: "+(quota==1?"Activo":"Pendiente de aprobación")));
            Button view=button(role.equals("APRENDIZ")?"Consultar / editar":"Consultar"); card.addView(view); view.setOnClickListener(v->showVehicleForm(item));
            if(role.equals("APRENDIZ")){ Button delete=button("Retirar vehículo"); card.addView(delete); delete.setOnClickListener(v->confirmDelete(item)); }
        }
        Button back=button("Volver al menú SECSS"); root.addView(back); back.setOnClickListener(v->showHome());
    }

    private void showVehicleForm(JSONObject existing) {
        boolean editing=existing!=null, canEdit=role.equals("APRENDIZ");
        selectedImages.clear();
        JSONObject details=editing?existing.optJSONObject("detalles"):null; if(details==null)details=new JSONObject();
        base(editing?"Detalle del vehículo":"Registrar vehículo");
        Spinner kind=new Spinner(this); ArrayAdapter<String> adapter=new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"MOTO","BICICLETA"}); kind.setAdapter(adapter);
        if(editing)kind.setSelection(existing.optString("tipo_vehiculo").equals("BICICLETA")?1:0); kind.setEnabled(!editing&&canEdit); root.addView(kind);
        EditText make=input("Marca");make.setText(editing?existing.optString("marca"):"");make.setEnabled(canEdit);root.addView(make);
        EditText color=input("Color");color.setText(editing?existing.optString("color"):"");color.setEnabled(canEdit);root.addView(color);
        EditText plate=input("Placa · ejemplo ABC12G");plate.setInputType(4096);plate.setText(details.optString("placa"));plate.setEnabled(canEdit);root.addView(plate);
        EditText cc=input("Cilindraje (c.c.)");cc.setInputType(2);cc.setText(details.optString("cilindraje"));cc.setEnabled(canEdit);root.addView(cc);
        EditText year=input("Modelo (año)");year.setInputType(2);year.setText(details.optString("modelo"));year.setEnabled(canEdit);root.addView(year);
        EditText frame=input("Número de marco");frame.setText(details.optString("numero_marco"));frame.setEnabled(canEdit);root.addView(frame);
        Spinner bikeClass=new Spinner(this);ArrayAdapter<String> classes=new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"Montaña","Ruta","Urbana","Electrica"});bikeClass.setAdapter(classes);
        if(editing){String cls=details.optString("clase_bicicleta");int ix=classes.getPosition(cls);if(ix>=0)bikeClass.setSelection(ix);}bikeClass.setEnabled(canEdit);root.addView(bikeClass);
        Runnable fields=()->{boolean moto=kind.getSelectedItem().toString().equals("MOTO");plate.setVisibility(moto?View.VISIBLE:View.GONE);cc.setVisibility(moto?View.VISIBLE:View.GONE);year.setVisibility(moto?View.VISIBLE:View.GONE);frame.setVisibility(moto?View.GONE:View.VISIBLE);bikeClass.setVisibility(moto?View.GONE:View.VISIBLE);for(int i=0;i<root.getChildCount();i++){View child=root.getChildAt(i);if("moto".equals(child.getTag()))child.setVisibility(moto?View.VISIBLE:View.GONE);}};
        kind.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){public void onNothingSelected(android.widget.AdapterView<?>p){} public void onItemSelected(android.widget.AdapterView<?>p,View v,int pos,long id){fields.run();}});fields.run();
        TextView docsTitle=label("Soportes documentales (JPG, PNG o WEBP; máximo 5 MB cada uno)");docsTitle.setTypeface(null,Typeface.BOLD);docsTitle.setPadding(0,dp(18),0,dp(4));root.addView(docsTitle);
        JSONObject savedImages=editing?existing.optJSONObject("imagenes"):null;
        if(savedImages==null)savedImages=new JSONObject();
        addImagePicker("Tarjeta de propiedad", "imagen_url_tarjeta_propiedad", savedImages.optString("imagen_url_tarjeta_propiedad"), canEdit, true);
        addImagePicker("Identificación / chasis", "imagen_url_identificacion_vehiculo", savedImages.optString("imagen_url_identificacion_vehiculo"), canEdit, true);
        addImagePicker("Foto del vehículo", "imagen_url_vehiculo", savedImages.optString("imagen_url_vehiculo"), canEdit, true);
        addImagePicker("SOAT vigente", "imagen_url_soat", savedImages.optString("imagen_url_soat"), canEdit, false);
        addImagePicker("Tecnomecánica vigente", "imagen_url_tecnomecanica_vigente", savedImages.optString("imagen_url_tecnomecanica_vigente"), canEdit, false);
        fields.run();
        if(canEdit){Button save=button(editing?"Guardar cambios":"Registrar");root.addView(save);save.setOnClickListener(v->{
            String type=kind.getSelectedItem().toString(),mk=make.getText().toString().trim(),cl=color.getText().toString().trim();
            if(mk.isEmpty()||cl.isEmpty()){toast("Completa marca y color.");return;}
            JSONObject payload=json("tipo_vehiculo",type,"marca",mk,"color",cl);
            if(type.equals("MOTO")){String pl=plate.getText().toString().trim().toUpperCase();if(!pl.matches("[A-Z]{3}\\d{2}[A-Z]")){toast("Revisa la placa (ejemplo ABC12G).");return;}if(cc.getText().length()==0||year.getText().length()==0){toast("Completa cilindraje y modelo.");return;}put(payload,"placa",pl);put(payload,"cilindraje",cc.getText().toString());put(payload,"modelo",year.getText().toString());}
            else {String fr=frame.getText().toString().trim();if(fr.length()<5){toast("El número de marco debe tener al menos 5 caracteres.");return;}put(payload,"numero_marco",fr.toUpperCase());put(payload,"clase_bicicleta",bikeClass.getSelectedItem().toString());}
            String path=editing?"/vehicle/"+existing.optInt("id"):"/vehicle";String method=editing?"PATCH":"POST";
            save.setEnabled(false);request(method,path,payload,token,selectedImages,res->{toast(res.optString("mensaje","Vehículo guardado."));loadVehicles();},err->{save.setEnabled(true);toast(err);});
        });}
        Button back=button("Volver a mis vehículos");root.addView(back);back.setOnClickListener(v->loadVehicles());
    }

    private void addImagePicker(String title,String key,String previous,boolean canEdit,boolean common) {
        LinearLayout row=new LinearLayout(this);row.setOrientation(LinearLayout.VERTICAL);row.setPadding(0,dp(4),0,dp(5));
        row.setTag(common?"common":"moto");
        TextView caption=label(title);caption.setTextSize(14);row.addView(caption);
        TextView status=label(previous.isEmpty()?"Sin archivo seleccionado":"Soporte ya registrado");status.setTextSize(12);row.addView(status);
        if(canEdit){Button choose=button("Seleccionar imagen");choose.setTextSize(13);row.addView(choose);choose.setOnClickListener(v->{pendingImageField=key;pendingImageLabel=status;Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("image/*");startActivityForResult(intent,PICK_IMAGE);});}
        root.addView(row);
    }

    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode!=PICK_IMAGE||resultCode!=RESULT_OK||data==null||data.getData()==null)return;
        Uri uri=data.getData();String mime=getContentResolver().getType(uri);
        if(mime==null||!(mime.equals("image/jpeg")||mime.equals("image/png")||mime.equals("image/webp"))){toast("Selecciona una imagen JPG, PNG o WEBP.");return;}
        selectedImages.put(pendingImageField,uri);
        if(pendingImageLabel!=null)pendingImageLabel.setText("Imagen seleccionada: "+displayName(uri));
    }

    private String displayName(Uri uri) {
        try(Cursor c=getContentResolver().query(uri,null,null,null,null)){if(c!=null&&c.moveToFirst()){int i=c.getColumnIndex(OpenableColumns.DISPLAY_NAME);if(i>=0)return c.getString(i);}}catch(Exception ignored){}
        return "archivo";
    }

    private void confirmDelete(JSONObject item) {
        new AlertDialog.Builder(this).setTitle("Retirar vehículo").setMessage("¿Quieres retirar este vehículo? El cupo quedará pendiente de aprobación.")
            .setNegativeButton("Cancelar",null).setPositiveButton("Retirar",(d,w)->request("DELETE","/vehicle/"+item.optInt("id"),null,token,res->{toast(res.optString("mensaje","Vehículo retirado."));loadVehicles();},this::toast)).show();
    }

    private interface Success { void run(JSONObject result); }
    private interface Failure { void run(String error); }
    private void request(String method,String path,JSONObject body,String auth,Success ok,Failure fail) {
        request(method,path,body,auth,null,ok,fail);
    }
    private void request(String method,String path,JSONObject body,String auth,Map<String,Uri> files,Success ok,Failure fail) {
        io.execute(()->{
            HttpURLConnection c=null;
            try {
                c=(HttpURLConnection)new URL(apiBase()+path).openConnection();c.setRequestMethod(method);c.setConnectTimeout(10000);c.setReadTimeout(15000);c.setRequestProperty("Accept","application/json");
                if(auth!=null&&!auth.isEmpty())c.setRequestProperty("Authorization","Bearer "+auth);
                if(body!=null){c.setDoOutput(true);if(files!=null&&!files.isEmpty()){String boundary="SECSS-"+System.currentTimeMillis();c.setRequestProperty("Content-Type","multipart/form-data; boundary="+boundary);try(DataOutputStream out=new DataOutputStream(c.getOutputStream())){java.util.Iterator<String>keys=body.keys();while(keys.hasNext()){String key=keys.next();writeField(out,boundary,key,body.optString(key));}for(Map.Entry<String,Uri>file:files.entrySet())writeFile(out,boundary,file.getKey(),file.getValue());out.writeBytes("--"+boundary+"--\r\n");}}else{c.setRequestProperty("Content-Type","application/json; charset=utf-8");try(OutputStream out=c.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}}}
                int status=c.getResponseCode();InputStream stream=status<400?c.getInputStream():c.getErrorStream();String response=read(stream);JSONObject json=response.isEmpty()?new JSONObject():new JSONObject(response);
                runOnUiThread(()->{if(status>=200&&status<300)ok.run(json);else fail.run(json.optString("mensaje","Error de conexión ("+status+")."));});
            } catch(Exception e){runOnUiThread(()->fail.run("No se pudo conectar con SECSS en el puerto 4001. Comprueba que el backend esté activo."));}
            finally {if(c!=null)c.disconnect();}
        });
    }

    private void writeField(DataOutputStream out,String boundary,String name,String value)throws Exception {
        out.writeBytes("--"+boundary+"\r\nContent-Disposition: form-data; name=\""+name+"\"\r\n\r\n"+value+"\r\n");
    }

    private void writeFile(DataOutputStream out,String boundary,String name,Uri uri)throws Exception {
        String mime=getContentResolver().getType(uri);String filename=displayName(uri).replace("\"","");
        out.writeBytes("--"+boundary+"\r\nContent-Disposition: form-data; name=\""+name+"\"; filename=\""+filename+"\"\r\nContent-Type: "+mime+"\r\n\r\n");
        try(InputStream in=getContentResolver().openInputStream(uri)){byte[]buffer=new byte[8192];int count;while(in!=null&&(count=in.read(buffer))!=-1)out.write(buffer,0,count);}
        out.writeBytes("\r\n");
    }

    private String read(InputStream in)throws Exception{if(in==null)return "";ByteArrayOutputStream b=new ByteArrayOutputStream();byte[]buf=new byte[2048];int n;while((n=in.read(buf))!=-1)b.write(buf,0,n);return b.toString("UTF-8");}
    private JSONObject json(String... pairs){JSONObject o=new JSONObject();for(int i=0;i+1<pairs.length;i+=2)put(o,pairs[i],pairs[i+1]);return o;}
    private void put(JSONObject o,String k,Object v){try{o.put(k,v);}catch(Exception ignored){}}
    private TextView label(String s){TextView t=new TextView(this);t.setText(s);t.setTextSize(15);t.setTextColor(Color.rgb(33,37,41));t.setPadding(0,dp(6),0,dp(6));return t;}
    private EditText input(String hint){EditText e=new EditText(this);e.setSingleLine(true);e.setTextSize(16);e.setHint(hint);e.setTextColor(Color.rgb(33,37,41));e.setPadding(dp(12),dp(8),dp(12),dp(8));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,dp(5),0,dp(5));e.setLayoutParams(p);return e;}
    private Button button(String text){Button b=new Button(this);b.setText(text);b.setAllCaps(false);b.setTextColor(Color.WHITE);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(SENA_GREEN));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,dp(8),0,dp(4));b.setLayoutParams(p);return b;}
    private GradientDrawable rounded(int color,int stroke){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(16));d.setStroke(dp(1),stroke);return d;}
    private int dp(int n){return (int)(n*getResources().getDisplayMetrics().density+0.5f);}
    private void toast(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
    private void hideKeyboard(){((InputMethodManager)getSystemService(Context.INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(root.getWindowToken(),0);}
    @Override protected void onDestroy(){super.onDestroy();io.shutdown();}
}
