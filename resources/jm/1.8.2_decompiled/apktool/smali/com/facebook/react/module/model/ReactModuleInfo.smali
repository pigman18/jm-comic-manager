.class public Lcom/facebook/react/module/model/ReactModuleInfo;
.super Ljava/lang/Object;
.source "ReactModuleInfo.java"


# instance fields
.field private final mCanOverrideExistingModule:Z

.field private mClassName:Ljava/lang/String;

.field private final mHasConstants:Z

.field private final mIsCxxModule:Z

.field private final mIsTurboModule:Z

.field private final mName:Ljava/lang/String;

.field private final mNeedsEagerInit:Z


# direct methods
.method public constructor <init>(Ljava/lang/String;Ljava/lang/String;ZZZZZ)V
    .locals 0

    .line 31
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 32
    iput-object p1, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mName:Ljava/lang/String;

    .line 33
    iput-object p2, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mClassName:Ljava/lang/String;

    .line 34
    iput-boolean p3, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mCanOverrideExistingModule:Z

    .line 35
    iput-boolean p4, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mNeedsEagerInit:Z

    .line 36
    iput-boolean p5, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mHasConstants:Z

    .line 37
    iput-boolean p6, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mIsCxxModule:Z

    .line 38
    iput-boolean p7, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mIsTurboModule:Z

    return-void
.end method


# virtual methods
.method public canOverrideExistingModule()Z
    .locals 1

    .line 50
    iget-boolean v0, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mCanOverrideExistingModule:Z

    return v0
.end method

.method public className()Ljava/lang/String;
    .locals 1

    .line 46
    iget-object v0, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mClassName:Ljava/lang/String;

    return-object v0
.end method

.method public hasConstants()Z
    .locals 1

    .line 58
    iget-boolean v0, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mHasConstants:Z

    return v0
.end method

.method public isCxxModule()Z
    .locals 1

    .line 62
    iget-boolean v0, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mIsCxxModule:Z

    return v0
.end method

.method public isTurboModule()Z
    .locals 1

    .line 66
    iget-boolean v0, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mIsTurboModule:Z

    return v0
.end method

.method public name()Ljava/lang/String;
    .locals 1

    .line 42
    iget-object v0, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mName:Ljava/lang/String;

    return-object v0
.end method

.method public needsEagerInit()Z
    .locals 1

    .line 54
    iget-boolean v0, p0, Lcom/facebook/react/module/model/ReactModuleInfo;->mNeedsEagerInit:Z

    return v0
.end method
