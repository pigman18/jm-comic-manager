.class Lcom/facebook/react/modules/toast/ToastModule$3;
.super Ljava/lang/Object;
.source "ToastModule.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/facebook/react/modules/toast/ToastModule;->showWithGravityAndOffset(Ljava/lang/String;DDDD)V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/facebook/react/modules/toast/ToastModule;

.field final synthetic val$duration:I

.field final synthetic val$gravity:I

.field final synthetic val$message:Ljava/lang/String;

.field final synthetic val$xOffset:I

.field final synthetic val$yOffset:I


# direct methods
.method constructor <init>(Lcom/facebook/react/modules/toast/ToastModule;Ljava/lang/String;IIII)V
    .locals 0

    .line 95
    iput-object p1, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->this$0:Lcom/facebook/react/modules/toast/ToastModule;

    iput-object p2, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->val$message:Ljava/lang/String;

    iput p3, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->val$duration:I

    iput p4, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->val$gravity:I

    iput p5, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->val$xOffset:I

    iput p6, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->val$yOffset:I

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 4

    .line 98
    iget-object v0, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->this$0:Lcom/facebook/react/modules/toast/ToastModule;

    invoke-static {v0}, Lcom/facebook/react/modules/toast/ToastModule;->access$200(Lcom/facebook/react/modules/toast/ToastModule;)Lcom/facebook/react/bridge/ReactApplicationContext;

    move-result-object v0

    iget-object v1, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->val$message:Ljava/lang/String;

    iget v2, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->val$duration:I

    invoke-static {v0, v1, v2}, Landroid/widget/Toast;->makeText(Landroid/content/Context;Ljava/lang/CharSequence;I)Landroid/widget/Toast;

    move-result-object v0

    .line 99
    iget v1, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->val$gravity:I

    iget v2, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->val$xOffset:I

    iget v3, p0, Lcom/facebook/react/modules/toast/ToastModule$3;->val$yOffset:I

    invoke-virtual {v0, v1, v2, v3}, Landroid/widget/Toast;->setGravity(III)V

    .line 100
    invoke-virtual {v0}, Landroid/widget/Toast;->show()V

    return-void
.end method
