.class Lcom/reactnativerestart/RestartModule$2;
.super Ljava/lang/Object;
.source "RestartModule.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/reactnativerestart/RestartModule;->loadBundle()V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/reactnativerestart/RestartModule;

.field final synthetic val$instanceManager:Lcom/facebook/react/ReactInstanceManager;


# direct methods
.method constructor <init>(Lcom/reactnativerestart/RestartModule;Lcom/facebook/react/ReactInstanceManager;)V
    .locals 0

    .line 51
    iput-object p1, p0, Lcom/reactnativerestart/RestartModule$2;->this$0:Lcom/reactnativerestart/RestartModule;

    iput-object p2, p0, Lcom/reactnativerestart/RestartModule$2;->val$instanceManager:Lcom/facebook/react/ReactInstanceManager;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 3

    .line 55
    :try_start_0
    new-instance v0, Ljava/io/File;

    iget-object v1, p0, Lcom/reactnativerestart/RestartModule$2;->this$0:Lcom/reactnativerestart/RestartModule;

    invoke-static {v1}, Lcom/reactnativerestart/RestartModule;->access$000(Lcom/reactnativerestart/RestartModule;)Landroid/content/Context;

    move-result-object v1

    invoke-virtual {v1}, Landroid/content/Context;->getFilesDir()Ljava/io/File;

    move-result-object v1

    invoke-virtual {v1}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;

    move-result-object v1

    const-string v2, "index.android.bundle"

    invoke-direct {v0, v1, v2}, Ljava/io/File;-><init>(Ljava/lang/String;Ljava/lang/String;)V

    .line 57
    invoke-virtual {v0}, Ljava/io/File;->exists()Z

    move-result v1

    if-eqz v1, :cond_0

    .line 58
    invoke-virtual {v0}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;

    move-result-object v0

    invoke-static {v0}, Lcom/facebook/react/bridge/JSBundleLoader;->createFileLoader(Ljava/lang/String;)Lcom/facebook/react/bridge/JSBundleLoader;

    move-result-object v0

    .line 59
    iget-object v1, p0, Lcom/reactnativerestart/RestartModule$2;->val$instanceManager:Lcom/facebook/react/ReactInstanceManager;

    invoke-virtual {v1}, Ljava/lang/Object;->getClass()Ljava/lang/Class;

    move-result-object v1

    const-string v2, "mBundleLoader"

    invoke-virtual {v1, v2}, Ljava/lang/Class;->getDeclaredField(Ljava/lang/String;)Ljava/lang/reflect/Field;

    move-result-object v1

    const/4 v2, 0x1

    .line 60
    invoke-virtual {v1, v2}, Ljava/lang/reflect/Field;->setAccessible(Z)V

    .line 61
    iget-object v2, p0, Lcom/reactnativerestart/RestartModule$2;->val$instanceManager:Lcom/facebook/react/ReactInstanceManager;

    invoke-virtual {v1, v2, v0}, Ljava/lang/reflect/Field;->set(Ljava/lang/Object;Ljava/lang/Object;)V

    .line 62
    iget-object v0, p0, Lcom/reactnativerestart/RestartModule$2;->val$instanceManager:Lcom/facebook/react/ReactInstanceManager;

    invoke-virtual {v0}, Lcom/facebook/react/ReactInstanceManager;->recreateReactContextInBackground()V

    goto :goto_0

    .line 64
    :cond_0
    iget-object v0, p0, Lcom/reactnativerestart/RestartModule$2;->this$0:Lcom/reactnativerestart/RestartModule;

    invoke-static {v0}, Lcom/reactnativerestart/RestartModule;->access$100(Lcom/reactnativerestart/RestartModule;)V
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    goto :goto_0

    .line 67
    :catchall_0
    iget-object v0, p0, Lcom/reactnativerestart/RestartModule$2;->this$0:Lcom/reactnativerestart/RestartModule;

    invoke-static {v0}, Lcom/reactnativerestart/RestartModule;->access$100(Lcom/reactnativerestart/RestartModule;)V

    :goto_0
    return-void
.end method
