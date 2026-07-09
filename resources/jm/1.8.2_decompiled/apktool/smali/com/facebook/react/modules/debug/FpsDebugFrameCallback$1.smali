.class Lcom/facebook/react/modules/debug/FpsDebugFrameCallback$1;
.super Ljava/lang/Object;
.source "FpsDebugFrameCallback.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;->start()V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;

.field final synthetic val$fpsDebugFrameCallback:Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;


# direct methods
.method constructor <init>(Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;)V
    .locals 0

    .line 133
    iput-object p1, p0, Lcom/facebook/react/modules/debug/FpsDebugFrameCallback$1;->this$0:Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;

    iput-object p2, p0, Lcom/facebook/react/modules/debug/FpsDebugFrameCallback$1;->val$fpsDebugFrameCallback:Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 2

    .line 136
    iget-object v0, p0, Lcom/facebook/react/modules/debug/FpsDebugFrameCallback$1;->this$0:Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;

    invoke-static {}, Lcom/facebook/react/modules/core/ChoreographerCompat;->getInstance()Lcom/facebook/react/modules/core/ChoreographerCompat;

    move-result-object v1

    invoke-static {v0, v1}, Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;->access$002(Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;Lcom/facebook/react/modules/core/ChoreographerCompat;)Lcom/facebook/react/modules/core/ChoreographerCompat;

    .line 137
    iget-object v0, p0, Lcom/facebook/react/modules/debug/FpsDebugFrameCallback$1;->this$0:Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;

    invoke-static {v0}, Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;->access$000(Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;)Lcom/facebook/react/modules/core/ChoreographerCompat;

    move-result-object v0

    iget-object v1, p0, Lcom/facebook/react/modules/debug/FpsDebugFrameCallback$1;->val$fpsDebugFrameCallback:Lcom/facebook/react/modules/debug/FpsDebugFrameCallback;

    invoke-virtual {v0, v1}, Lcom/facebook/react/modules/core/ChoreographerCompat;->postFrameCallback(Lcom/facebook/react/modules/core/ChoreographerCompat$FrameCallback;)V

    return-void
.end method
