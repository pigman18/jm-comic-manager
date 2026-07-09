.class Lcom/facebook/react/turbomodule/core/TurboModuleManager$1;
.super Ljava/lang/Object;
.source "TurboModuleManager.java"

# interfaces
.implements Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleProvider;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/facebook/react/turbomodule/core/TurboModuleManager;-><init>(Lcom/facebook/react/bridge/JavaScriptContextHolder;Lcom/facebook/react/turbomodule/core/TurboModuleManagerDelegate;Lcom/facebook/react/turbomodule/core/interfaces/CallInvokerHolder;Lcom/facebook/react/turbomodule/core/interfaces/CallInvokerHolder;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/facebook/react/turbomodule/core/TurboModuleManager;

.field final synthetic val$delegate:Lcom/facebook/react/turbomodule/core/TurboModuleManagerDelegate;


# direct methods
.method constructor <init>(Lcom/facebook/react/turbomodule/core/TurboModuleManager;Lcom/facebook/react/turbomodule/core/TurboModuleManagerDelegate;)V
    .locals 0

    .line 69
    iput-object p1, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$1;->this$0:Lcom/facebook/react/turbomodule/core/TurboModuleManager;

    iput-object p2, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$1;->val$delegate:Lcom/facebook/react/turbomodule/core/TurboModuleManagerDelegate;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public getModule(Ljava/lang/String;)Lcom/facebook/react/turbomodule/core/interfaces/TurboModule;
    .locals 1

    .line 72
    iget-object v0, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$1;->val$delegate:Lcom/facebook/react/turbomodule/core/TurboModuleManagerDelegate;

    if-nez v0, :cond_0

    const/4 p1, 0x0

    return-object p1

    .line 76
    :cond_0
    invoke-virtual {v0, p1}, Lcom/facebook/react/turbomodule/core/TurboModuleManagerDelegate;->getModule(Ljava/lang/String;)Lcom/facebook/react/turbomodule/core/interfaces/TurboModule;

    move-result-object p1

    return-object p1
.end method
