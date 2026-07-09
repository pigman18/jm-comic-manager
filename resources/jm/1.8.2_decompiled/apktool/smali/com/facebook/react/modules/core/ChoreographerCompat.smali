.class public Lcom/facebook/react/modules/core/ChoreographerCompat;
.super Ljava/lang/Object;
.source "ChoreographerCompat.java"


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lcom/facebook/react/modules/core/ChoreographerCompat$FrameCallback;
    }
.end annotation


# static fields
.field private static final ONE_FRAME_MILLIS:J = 0x11L

.field private static sInstance:Lcom/facebook/react/modules/core/ChoreographerCompat;


# instance fields
.field private mChoreographer:Landroid/view/Choreographer;

.field private mHandler:Landroid/os/Handler;


# direct methods
.method private constructor <init>()V
    .locals 1

    .line 36
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 37
    invoke-direct {p0}, Lcom/facebook/react/modules/core/ChoreographerCompat;->getChoreographer()Landroid/view/Choreographer;

    move-result-object v0

    iput-object v0, p0, Lcom/facebook/react/modules/core/ChoreographerCompat;->mChoreographer:Landroid/view/Choreographer;

    return-void
.end method

.method private choreographerPostFrameCallback(Landroid/view/Choreographer$FrameCallback;)V
    .locals 1

    .line 57
    iget-object v0, p0, Lcom/facebook/react/modules/core/ChoreographerCompat;->mChoreographer:Landroid/view/Choreographer;

    invoke-virtual {v0, p1}, Landroid/view/Choreographer;->postFrameCallback(Landroid/view/Choreographer$FrameCallback;)V

    return-void
.end method

.method private choreographerPostFrameCallbackDelayed(Landroid/view/Choreographer$FrameCallback;J)V
    .locals 1

    .line 62
    iget-object v0, p0, Lcom/facebook/react/modules/core/ChoreographerCompat;->mChoreographer:Landroid/view/Choreographer;

    invoke-virtual {v0, p1, p2, p3}, Landroid/view/Choreographer;->postFrameCallbackDelayed(Landroid/view/Choreographer$FrameCallback;J)V

    return-void
.end method

.method private choreographerRemoveFrameCallback(Landroid/view/Choreographer$FrameCallback;)V
    .locals 1

    .line 66
    iget-object v0, p0, Lcom/facebook/react/modules/core/ChoreographerCompat;->mChoreographer:Landroid/view/Choreographer;

    invoke-virtual {v0, p1}, Landroid/view/Choreographer;->removeFrameCallback(Landroid/view/Choreographer$FrameCallback;)V

    return-void
.end method

.method private getChoreographer()Landroid/view/Choreographer;
    .locals 1

    .line 53
    invoke-static {}, Landroid/view/Choreographer;->getInstance()Landroid/view/Choreographer;

    move-result-object v0

    return-object v0
.end method

.method public static getInstance()Lcom/facebook/react/modules/core/ChoreographerCompat;
    .locals 1

    .line 29
    invoke-static {}, Lcom/facebook/react/bridge/UiThreadUtil;->assertOnUiThread()V

    .line 30
    sget-object v0, Lcom/facebook/react/modules/core/ChoreographerCompat;->sInstance:Lcom/facebook/react/modules/core/ChoreographerCompat;

    if-nez v0, :cond_0

    .line 31
    new-instance v0, Lcom/facebook/react/modules/core/ChoreographerCompat;

    invoke-direct {v0}, Lcom/facebook/react/modules/core/ChoreographerCompat;-><init>()V

    sput-object v0, Lcom/facebook/react/modules/core/ChoreographerCompat;->sInstance:Lcom/facebook/react/modules/core/ChoreographerCompat;

    .line 33
    :cond_0
    sget-object v0, Lcom/facebook/react/modules/core/ChoreographerCompat;->sInstance:Lcom/facebook/react/modules/core/ChoreographerCompat;

    return-object v0
.end method


# virtual methods
.method public postFrameCallback(Lcom/facebook/react/modules/core/ChoreographerCompat$FrameCallback;)V
    .locals 0

    .line 41
    invoke-virtual {p1}, Lcom/facebook/react/modules/core/ChoreographerCompat$FrameCallback;->getFrameCallback()Landroid/view/Choreographer$FrameCallback;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/facebook/react/modules/core/ChoreographerCompat;->choreographerPostFrameCallback(Landroid/view/Choreographer$FrameCallback;)V

    return-void
.end method

.method public postFrameCallbackDelayed(Lcom/facebook/react/modules/core/ChoreographerCompat$FrameCallback;J)V
    .locals 0

    .line 45
    invoke-virtual {p1}, Lcom/facebook/react/modules/core/ChoreographerCompat$FrameCallback;->getFrameCallback()Landroid/view/Choreographer$FrameCallback;

    move-result-object p1

    invoke-direct {p0, p1, p2, p3}, Lcom/facebook/react/modules/core/ChoreographerCompat;->choreographerPostFrameCallbackDelayed(Landroid/view/Choreographer$FrameCallback;J)V

    return-void
.end method

.method public removeFrameCallback(Lcom/facebook/react/modules/core/ChoreographerCompat$FrameCallback;)V
    .locals 0

    .line 49
    invoke-virtual {p1}, Lcom/facebook/react/modules/core/ChoreographerCompat$FrameCallback;->getFrameCallback()Landroid/view/Choreographer$FrameCallback;

    move-result-object p1

    invoke-direct {p0, p1}, Lcom/facebook/react/modules/core/ChoreographerCompat;->choreographerRemoveFrameCallback(Landroid/view/Choreographer$FrameCallback;)V

    return-void
.end method
