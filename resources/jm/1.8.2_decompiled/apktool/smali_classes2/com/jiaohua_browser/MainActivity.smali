.class public Lcom/jiaohua_browser/MainActivity;
.super Lcom/facebook/react/ReactActivity;
.source "MainActivity.java"


# direct methods
.method public constructor <init>()V
    .locals 0

    .line 8
    invoke-direct {p0}, Lcom/facebook/react/ReactActivity;-><init>()V

    return-void
.end method


# virtual methods
.method protected getMainComponentName()Ljava/lang/String;
    .locals 1

    const-string v0, "jiaohua_browser"

    return-object v0
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 0

    const/4 p1, 0x0

    .line 21
    invoke-super {p0, p1}, Lcom/facebook/react/ReactActivity;->onCreate(Landroid/os/Bundle;)V

    return-void
.end method

.method public onKeyDown(ILandroid/view/KeyEvent;)Z
    .locals 1

    .line 40
    invoke-static {}, Lcom/github/kevinejohn/keyevent/KeyEventModule;->getInstance()Lcom/github/kevinejohn/keyevent/KeyEventModule;

    move-result-object v0

    invoke-virtual {v0, p1, p2}, Lcom/github/kevinejohn/keyevent/KeyEventModule;->onKeyDownEvent(ILandroid/view/KeyEvent;)V

    .line 51
    invoke-super {p0, p1, p2}, Lcom/facebook/react/ReactActivity;->onKeyDown(ILandroid/view/KeyEvent;)Z

    const/4 p1, 0x1

    return p1
.end method

.method public onKeyMultiple(IILandroid/view/KeyEvent;)Z
    .locals 1

    .line 73
    invoke-static {}, Lcom/github/kevinejohn/keyevent/KeyEventModule;->getInstance()Lcom/github/kevinejohn/keyevent/KeyEventModule;

    move-result-object v0

    invoke-virtual {v0, p1, p2, p3}, Lcom/github/kevinejohn/keyevent/KeyEventModule;->onKeyMultipleEvent(IILandroid/view/KeyEvent;)V

    .line 74
    invoke-super {p0, p1, p2, p3}, Lcom/facebook/react/ReactActivity;->onKeyMultiple(IILandroid/view/KeyEvent;)Z

    move-result p1

    return p1
.end method

.method public onKeyUp(ILandroid/view/KeyEvent;)Z
    .locals 1

    .line 57
    invoke-static {}, Lcom/github/kevinejohn/keyevent/KeyEventModule;->getInstance()Lcom/github/kevinejohn/keyevent/KeyEventModule;

    move-result-object v0

    invoke-virtual {v0, p1, p2}, Lcom/github/kevinejohn/keyevent/KeyEventModule;->onKeyUpEvent(ILandroid/view/KeyEvent;)V

    .line 67
    invoke-super {p0, p1, p2}, Lcom/facebook/react/ReactActivity;->onKeyUp(ILandroid/view/KeyEvent;)Z

    const/4 p1, 0x1

    return p1
.end method

.method public setRequestedOrientation(I)V
    .locals 0

    return-void
.end method
