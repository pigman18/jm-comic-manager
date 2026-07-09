.class Lcom/facebook/react/views/picker/ReactPicker$2;
.super Ljava/lang/Object;
.source "ReactPicker.java"

# interfaces
.implements Ljava/lang/Runnable;


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/facebook/react/views/picker/ReactPicker;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/facebook/react/views/picker/ReactPicker;


# direct methods
.method constructor <init>(Lcom/facebook/react/views/picker/ReactPicker;)V
    .locals 0

    .line 75
    iput-object p1, p0, Lcom/facebook/react/views/picker/ReactPicker$2;->this$0:Lcom/facebook/react/views/picker/ReactPicker;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public run()V
    .locals 5

    .line 78
    iget-object v0, p0, Lcom/facebook/react/views/picker/ReactPicker$2;->this$0:Lcom/facebook/react/views/picker/ReactPicker;

    .line 79
    invoke-virtual {v0}, Lcom/facebook/react/views/picker/ReactPicker;->getWidth()I

    move-result v1

    const/high16 v2, 0x40000000    # 2.0f

    invoke-static {v1, v2}, Landroid/view/View$MeasureSpec;->makeMeasureSpec(II)I

    move-result v1

    iget-object v3, p0, Lcom/facebook/react/views/picker/ReactPicker$2;->this$0:Lcom/facebook/react/views/picker/ReactPicker;

    .line 80
    invoke-virtual {v3}, Lcom/facebook/react/views/picker/ReactPicker;->getHeight()I

    move-result v3

    invoke-static {v3, v2}, Landroid/view/View$MeasureSpec;->makeMeasureSpec(II)I

    move-result v2

    .line 78
    invoke-virtual {v0, v1, v2}, Lcom/facebook/react/views/picker/ReactPicker;->measure(II)V

    .line 81
    iget-object v0, p0, Lcom/facebook/react/views/picker/ReactPicker$2;->this$0:Lcom/facebook/react/views/picker/ReactPicker;

    invoke-virtual {v0}, Lcom/facebook/react/views/picker/ReactPicker;->getLeft()I

    move-result v1

    iget-object v2, p0, Lcom/facebook/react/views/picker/ReactPicker$2;->this$0:Lcom/facebook/react/views/picker/ReactPicker;

    invoke-virtual {v2}, Lcom/facebook/react/views/picker/ReactPicker;->getTop()I

    move-result v2

    iget-object v3, p0, Lcom/facebook/react/views/picker/ReactPicker$2;->this$0:Lcom/facebook/react/views/picker/ReactPicker;

    invoke-virtual {v3}, Lcom/facebook/react/views/picker/ReactPicker;->getRight()I

    move-result v3

    iget-object v4, p0, Lcom/facebook/react/views/picker/ReactPicker$2;->this$0:Lcom/facebook/react/views/picker/ReactPicker;

    invoke-virtual {v4}, Lcom/facebook/react/views/picker/ReactPicker;->getBottom()I

    move-result v4

    invoke-virtual {v0, v1, v2, v3, v4}, Lcom/facebook/react/views/picker/ReactPicker;->layout(IIII)V

    return-void
.end method
