.class public abstract Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate$Builder;
.super Ljava/lang/Object;
.source "ReactPackageTurboModuleManagerDelegate.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x409
    name = "Builder"
.end annotation


# instance fields
.field private mContext:Lcom/facebook/react/bridge/ReactApplicationContext;

.field private mPackages:Ljava/util/List;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/List<",
            "Lcom/facebook/react/ReactPackage;",
            ">;"
        }
    .end annotation
.end field


# direct methods
.method public constructor <init>()V
    .locals 0

    .line 126
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public build()Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate;
    .locals 2

    .line 144
    iget-object v0, p0, Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate$Builder;->mContext:Lcom/facebook/react/bridge/ReactApplicationContext;

    const-string v1, "The ReactApplicationContext must be provided to create ReactPackageTurboModuleManagerDelegate"

    invoke-static {v0, v1}, Lcom/facebook/infer/annotation/Assertions;->assertNotNull(Ljava/lang/Object;Ljava/lang/String;)Ljava/lang/Object;

    .line 147
    iget-object v0, p0, Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate$Builder;->mPackages:Ljava/util/List;

    const-string v1, "A set of ReactPackages must be provided to create ReactPackageTurboModuleManagerDelegate"

    invoke-static {v0, v1}, Lcom/facebook/infer/annotation/Assertions;->assertNotNull(Ljava/lang/Object;Ljava/lang/String;)Ljava/lang/Object;

    .line 150
    iget-object v0, p0, Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate$Builder;->mContext:Lcom/facebook/react/bridge/ReactApplicationContext;

    iget-object v1, p0, Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate$Builder;->mPackages:Ljava/util/List;

    invoke-virtual {p0, v0, v1}, Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate$Builder;->build(Lcom/facebook/react/bridge/ReactApplicationContext;Ljava/util/List;)Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate;

    move-result-object v0

    return-object v0
.end method

.method protected abstract build(Lcom/facebook/react/bridge/ReactApplicationContext;Ljava/util/List;)Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Lcom/facebook/react/bridge/ReactApplicationContext;",
            "Ljava/util/List<",
            "Lcom/facebook/react/ReactPackage;",
            ">;)",
            "Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate;"
        }
    .end annotation
.end method

.method public setPackages(Ljava/util/List;)Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate$Builder;
    .locals 1
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Ljava/util/List<",
            "Lcom/facebook/react/ReactPackage;",
            ">;)",
            "Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate$Builder;"
        }
    .end annotation

    .line 131
    new-instance v0, Ljava/util/ArrayList;

    invoke-direct {v0, p1}, Ljava/util/ArrayList;-><init>(Ljava/util/Collection;)V

    iput-object v0, p0, Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate$Builder;->mPackages:Ljava/util/List;

    return-object p0
.end method

.method public setReactApplicationContext(Lcom/facebook/react/bridge/ReactApplicationContext;)Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate$Builder;
    .locals 0

    .line 136
    iput-object p1, p0, Lcom/facebook/react/turbomodule/core/ReactPackageTurboModuleManagerDelegate$Builder;->mContext:Lcom/facebook/react/bridge/ReactApplicationContext;

    return-object p0
.end method
