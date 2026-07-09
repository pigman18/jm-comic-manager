.class Lcom/facebook/react/modules/core/ReactChoreographer$2;
.super Ljava/lang/Object;
.source "ReactChoreographer.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/facebook/react/modules/core/ReactChoreographer;->initializeChoreographer(Ljava/lang/Runnable;)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/facebook/react/modules/core/ReactChoreographer;

.field final synthetic val$runnable:Ljava/lang/Runnable;


# direct methods
.method constructor <init>(Lcom/facebook/react/modules/core/ReactChoreographer;Ljava/lang/Runnable;)V
    .locals 0

    .line 122
    iput-object p1, p0, Lcom/facebook/react/modules/core/ReactChoreographer$2;->this$0:Lcom/facebook/react/modules/core/ReactChoreographer;

    iput-object p2, p0, Lcom/facebook/react/modules/core/ReactChoreographer$2;->val$runnable:Ljava/lang/Runnable;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 3

    .line 125
    const-class v0, Lcom/facebook/react/modules/core/ReactChoreographer;

    monitor-enter v0

    .line 126
    :try_start_0
    iget-object v1, p0, Lcom/facebook/react/modules/core/ReactChoreographer$2;->this$0:Lcom/facebook/react/modules/core/ReactChoreographer;

    invoke-static {v1}, Lcom/facebook/react/modules/core/ReactChoreographer;->access$200(Lcom/facebook/react/modules/core/ReactChoreographer;)Lcom/facebook/react/modules/core/ChoreographerCompat;

    move-result-object v1

    if-nez v1, :cond_0

    .line 127
    iget-object v1, p0, Lcom/facebook/react/modules/core/ReactChoreographer$2;->this$0:Lcom/facebook/react/modules/core/ReactChoreographer;

    invoke-static {}, Lcom/facebook/react/modules/core/ChoreographerCompat;->getInstance()Lcom/facebook/react/modules/core/ChoreographerCompat;

    move-result-object v2

    invoke-static {v1, v2}, Lcom/facebook/react/modules/core/ReactChoreographer;->access$202(Lcom/facebook/react/modules/core/ReactChoreographer;Lcom/facebook/react/modules/core/ChoreographerCompat;)Lcom/facebook/react/modules/core/ChoreographerCompat;

    .line 129
    :cond_0
    monitor-exit v0
    :try_end_0
    .catchall {:try_start_0 .. :try_end_0} :catchall_0

    .line 130
    iget-object v0, p0, Lcom/facebook/react/modules/core/ReactChoreographer$2;->val$runnable:Ljava/lang/Runnable;

    if-eqz v0, :cond_1

    .line 131
    invoke-interface {v0}, Ljava/lang/Runnable;->run()V

    :cond_1
    return-void

    :catchall_0
    move-exception v1

    .line 129
    :try_start_1
    monitor-exit v0
    :try_end_1
    .catchall {:try_start_1 .. :try_end_1} :catchall_0

    throw v1
.end method
