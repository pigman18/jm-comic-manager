.class public Lcom/reactnativerestart/RestartModule;
.super Lcom/facebook/react/bridge/ReactContextBaseJavaModule;
.source "RestartModule.java"


# static fields
.field private static final REACT_APPLICATION_CLASS_NAME:Ljava/lang/String; = "com.facebook.react.ReactApplication"

.field private static final REACT_NATIVE_HOST_CLASS_NAME:Ljava/lang/String; = "com.facebook.react.ReactNativeHost"

.field private static mReactInstanceHolder:Lcom/reactnativerestart/ReactInstanceHolder;


# instance fields
.field private context:Landroid/content/Context;

.field private mLifecycleEventListener:Lcom/facebook/react/bridge/LifecycleEventListener;


# direct methods
.method public constructor <init>(Lcom/facebook/react/bridge/ReactApplicationContext;)V
    .locals 1

    .line 25
    invoke-direct {p0, p1}, Lcom/facebook/react/bridge/ReactContextBaseJavaModule;-><init>(Lcom/facebook/react/bridge/ReactApplicationContext;)V

    const/4 v0, 0x0

    .line 22
    iput-object v0, p0, Lcom/reactnativerestart/RestartModule;->mLifecycleEventListener:Lcom/facebook/react/bridge/LifecycleEventListener;

    .line 26
    iput-object p1, p0, Lcom/reactnativerestart/RestartModule;->context:Landroid/content/Context;

    return-void
.end method

.method static synthetic access$000(Lcom/reactnativerestart/RestartModule;)Landroid/content/Context;
    .locals 0

    .line 17
    iget-object p0, p0, Lcom/reactnativerestart/RestartModule;->context:Landroid/content/Context;

    return-object p0
.end method

.method static synthetic access$100(Lcom/reactnativerestart/RestartModule;)V
    .locals 0

    .line 17
    invoke-direct {p0}, Lcom/reactnativerestart/RestartModule;->loadBundleLegacy()V

    return-void
.end method

.method private clearLifecycleEventListener()V
    .locals 2

    .line 105
    iget-object v0, p0, Lcom/reactnativerestart/RestartModule;->mLifecycleEventListener:Lcom/facebook/react/bridge/LifecycleEventListener;

    if-eqz v0, :cond_0

    .line 106
    invoke-virtual {p0}, Lcom/reactnativerestart/RestartModule;->getReactApplicationContext()Lcom/facebook/react/bridge/ReactApplicationContext;

    move-result-object v0

    iget-object v1, p0, Lcom/reactnativerestart/RestartModule;->mLifecycleEventListener:Lcom/facebook/react/bridge/LifecycleEventListener;

    invoke-virtual {v0, v1}, Lcom/facebook/react/bridge/ReactApplicationContext;->removeLifecycleEventListener(Lcom/facebook/react/bridge/LifecycleEventListener;)V

    const/4 v0, 0x0

    .line 107
    iput-object v0, p0, Lcom/reactnativerestart/RestartModule;->mLifecycleEventListener:Lcom/facebook/react/bridge/LifecycleEventListener;

    :cond_0
    return-void
.end method

.method static getReactInstanceManager()Lcom/facebook/react/ReactInstanceManager;
    .locals 1

    .line 80
    sget-object v0, Lcom/reactnativerestart/RestartModule;->mReactInstanceHolder:Lcom/reactnativerestart/ReactInstanceHolder;

    if-nez v0, :cond_0

    const/4 v0, 0x0

    return-object v0

    .line 83
    :cond_0
    invoke-interface {v0}, Lcom/reactnativerestart/ReactInstanceHolder;->getReactInstanceManager()Lcom/facebook/react/ReactInstanceManager;

    move-result-object v0

    return-object v0
.end method

.method private loadBundle()V
    .locals 3

    .line 44
    invoke-direct {p0}, Lcom/reactnativerestart/RestartModule;->clearLifecycleEventListener()V

    .line 46
    :try_start_0
    invoke-direct {p0}, Lcom/reactnativerestart/RestartModule;->resolveInstanceManager()Lcom/facebook/react/ReactInstanceManager;

    move-result-object v0

    if-nez v0, :cond_0

    return-void

    .line 51
    :cond_0
    new-instance v1, Landroid/os/Handler;

    invoke-static {}, Landroid/os/Looper;->getMainLooper()Landroid/os/Looper;

    move-result-object v2

    invoke-direct {v1, v2}, Landroid/os/Handler;-><init>(Landroid/os/Looper;)V

    new-instance v2, Lcom/reactnativerestart/RestartModule$2;

    invoke-direct {v2, p0, v0}, Lcom/reactnativerestart/RestartModule$2;-><init>(Lcom/reactnativerestart/RestartModule;Lcom/facebook/react/ReactInstanceManager;)V

    invoke-virtual {v1, v2}, Landroid/os/Handler;->post(Ljava/lang/Runnable;)Z
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    .line 73
    :catchall_0
    invoke-direct {p0}, Lcom/reactnativerestart/RestartModule;->loadBundleLegacy()V

    :goto_0
    return-void
.end method

.method private loadBundleLegacy()V
    .locals 2

    .line 30
    invoke-virtual {p0}, Lcom/reactnativerestart/RestartModule;->getCurrentActivity()Landroid/app/Activity;

    move-result-object v0

    if-nez v0, :cond_0

    return-void

    .line 35
    :cond_0
    new-instance v1, Lcom/reactnativerestart/RestartModule$1;

    invoke-direct {v1, p0, v0}, Lcom/reactnativerestart/RestartModule$1;-><init>(Lcom/reactnativerestart/RestartModule;Landroid/app/Activity;)V

    invoke-virtual {v0, v1}, Landroid/app/Activity;->runOnUiThread(Ljava/lang/Runnable;)V

    return-void
.end method

.method private resolveInstanceManager()Lcom/facebook/react/ReactInstanceManager;
    .locals 1
    .annotation system Ldalvik/annotation/Throws;
        value = {
            Ljava/lang/NoSuchFieldException;,
            Ljava/lang/IllegalAccessException;
        }
    .end annotation

    .line 87
    invoke-static {}, Lcom/reactnativerestart/RestartModule;->getReactInstanceManager()Lcom/facebook/react/ReactInstanceManager;

    move-result-object v0

    if-eqz v0, :cond_0

    return-object v0

    .line 92
    :cond_0
    invoke-virtual {p0}, Lcom/reactnativerestart/RestartModule;->getCurrentActivity()Landroid/app/Activity;

    move-result-object v0

    if-nez v0, :cond_1

    const/4 v0, 0x0

    return-object v0

    .line 97
    :cond_1
    invoke-virtual {v0}, Landroid/app/Activity;->getApplication()Landroid/app/Application;

    move-result-object v0

    check-cast v0, Lcom/facebook/react/ReactApplication;

    .line 98
    invoke-interface {v0}, Lcom/facebook/react/ReactApplication;->getReactNativeHost()Lcom/facebook/react/ReactNativeHost;

    move-result-object v0

    invoke-virtual {v0}, Lcom/facebook/react/ReactNativeHost;->getReactInstanceManager()Lcom/facebook/react/ReactInstanceManager;

    move-result-object v0

    return-object v0
.end method


# virtual methods
.method public Restart()V
    .locals 0
    .annotation runtime Lcom/facebook/react/bridge/ReactMethod;
    .end annotation

    .line 113
    invoke-direct {p0}, Lcom/reactnativerestart/RestartModule;->loadBundle()V

    return-void
.end method

.method public getName()Ljava/lang/String;
    .locals 1

    const-string v0, "RNRestart"

    return-object v0
.end method
