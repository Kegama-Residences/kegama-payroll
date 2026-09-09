package com.kegama.payroll;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.graphics.Color;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void print() {
                    runOnUiThread(() -> {
                        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        if (printManager != null) {
                            PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter("Kegama_Payslip_Print");
                            PrintAttributes.Builder builder = new PrintAttributes.Builder();
                            builder.setMediaSize(PrintAttributes.MediaSize.NA_LETTER);
                            builder.setMinMargins(PrintAttributes.Margins.NO_MARGINS);
                            printManager.print("Kegama Payslip", printAdapter, builder.build());
                        }
                    });
                }

                @JavascriptInterface
                public void printHtml(final String html, final String title) {
                    runOnUiThread(() -> {
                        final String jobTitle = (title != null && !title.isEmpty()) ? title : "Kegama Payslip";
                        final WebView printWebView = new WebView(MainActivity.this);
                        printWebView.setBackgroundColor(Color.WHITE);
                        printWebView.getSettings().setJavaScriptEnabled(false);
                        printWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public void onPageFinished(WebView view, String url) {
                                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                                if (printManager != null) {
                                    PrintDocumentAdapter printAdapter = printWebView.createPrintDocumentAdapter(jobTitle);
                                    PrintAttributes.Builder builder = new PrintAttributes.Builder();
                                    builder.setMediaSize(PrintAttributes.MediaSize.NA_LETTER);
                                    builder.setColorMode(PrintAttributes.COLOR_MODE_COLOR);
                                    builder.setMinMargins(PrintAttributes.Margins.NO_MARGINS);
                                    printManager.print(jobTitle, printAdapter, builder.build());
                                }
                            }
                        });
                        printWebView.loadDataWithBaseURL("file:///android_asset/", html, "text/html", "UTF-8", null);
                    });
                }
            }, "NativeAndroidPrinter");

            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void installApk(final String fileUriString) {
                    runOnUiThread(() -> {
                        try {
                            android.net.Uri apkUri;
                            if (fileUriString != null && fileUriString.startsWith("content://")) {
                                apkUri = android.net.Uri.parse(fileUriString);
                            } else if (fileUriString != null && fileUriString.startsWith("file://")) {
                                java.io.File file = new java.io.File(android.net.Uri.parse(fileUriString).getPath());
                                apkUri = androidx.core.content.FileProvider.getUriForFile(
                                    MainActivity.this,
                                    getPackageName() + ".fileprovider",
                                    file
                                );
                            } else {
                                java.io.File file = new java.io.File(fileUriString != null ? fileUriString : "");
                                apkUri = androidx.core.content.FileProvider.getUriForFile(
                                    MainActivity.this,
                                    getPackageName() + ".fileprovider",
                                    file
                                );
                            }

                            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                            intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                        } catch (Exception e) {
                            android.util.Log.e("KegamaUpdater", "Failed to launch in-app installer", e);
                        }
                    });
                }
            }, "NativeAndroidUpdater");
        }
    }
}
