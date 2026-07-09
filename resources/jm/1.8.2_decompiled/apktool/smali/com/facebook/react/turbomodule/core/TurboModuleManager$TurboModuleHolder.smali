.class Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;
.super Ljava/lang/Object;
.source "TurboModuleManager.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/facebook/react/turbomodule/core/TurboModuleManager;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0xa
    name = "TurboModuleHolder"
.end annotation


# instance fields
.field private volatile mIsDoneCreatingModule:Z

.field private volatile mIsTryingToCreate:Z

.field private volatile mModule:Lcom/facebook/react/turbomodule/core/interfaces/TurboModule;


# direct methods
.method private constructor <init>()V
    .locals 1

    .line 322
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    const/4 v0, 0x0

    .line 323
    iput-object v0, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;->mModule:Lcom/facebook/react/turbomodule/core/interfaces/TurboModule;

    const/4 v0, 0x0

    .line 324
    iput-boolean v0, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;->mIsTryingToCreate:Z

    .line 325
    iput-boolean v0, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;->mIsDoneCreatingModule:Z

    return-void
.end method

.method synthetic constructor <init>(Lcom/facebook/react/turbomodule/core/TurboModuleManager$1;)V
    .locals 0

    .line 322
    invoke-direct {p0}, Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;-><init>()V

    return-void
.end method


# virtual methods
.method endCreatingModule()V
    .locals 1

    const/4 v0, 0x0

    .line 341
    iput-boolean v0, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;->mIsTryingToCreate:Z

    const/4 v0, 0x1

    .line 342
    iput-boolean v0, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;->mIsDoneCreatingModule:Z

    return-void
.end method

.method getModule()Lcom/facebook/react/turbomodule/core/interfaces/TurboModule;
    .locals 1

    .line 333
    iget-object v0, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;->mModule:Lcom/facebook/react/turbomodule/core/interfaces/TurboModule;

    return-object v0
.end method

.method isCreatingModule()Z
    .locals 1

    .line 350
    iget-boolean v0, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;->mIsTryingToCreate:Z

    return v0
.end method

.method isDoneCreatingModule()Z
    .locals 1

    .line 346
    iget-boolean v0, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;->mIsDoneCreatingModule:Z

    return v0
.end method

.method setModule(Lcom/facebook/react/turbomodule/core/interfaces/TurboModule;)V
    .locals 0

    .line 328
    iput-object p1, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;->mModule:Lcom/facebook/react/turbomodule/core/interfaces/TurboModule;

    return-void
.end method

.method startCreatingModule()V
    .locals 1

    const/4 v0, 0x1

    .line 337
    iput-boolean v0, p0, Lcom/facebook/react/turbomodule/core/TurboModuleManager$TurboModuleHolder;->mIsTryingToCreate:Z

    return-void
.end method
