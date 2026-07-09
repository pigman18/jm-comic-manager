.class Lcom/facebook/react/views/text/ReactBaseTextShadowNode$SetSpanOperation;
.super Ljava/lang/Object;
.source "ReactBaseTextShadowNode.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/facebook/react/views/text/ReactBaseTextShadowNode;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0xa
    name = "SetSpanOperation"
.end annotation


# instance fields
.field protected end:I

.field protected start:I

.field protected what:Lcom/facebook/react/views/text/ReactSpan;


# direct methods
.method constructor <init>(IILcom/facebook/react/views/text/ReactSpan;)V
    .locals 0

    .line 74
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 75
    iput p1, p0, Lcom/facebook/react/views/text/ReactBaseTextShadowNode$SetSpanOperation;->start:I

    .line 76
    iput p2, p0, Lcom/facebook/react/views/text/ReactBaseTextShadowNode$SetSpanOperation;->end:I

    .line 77
    iput-object p3, p0, Lcom/facebook/react/views/text/ReactBaseTextShadowNode$SetSpanOperation;->what:Lcom/facebook/react/views/text/ReactSpan;

    return-void
.end method


# virtual methods
.method public execute(Landroid/text/SpannableStringBuilder;I)V
    .locals 3

    .line 84
    iget v0, p0, Lcom/facebook/react/views/text/ReactBaseTextShadowNode$SetSpanOperation;->start:I

    if-nez v0, :cond_0

    const/16 v0, 0x12

    goto :goto_0

    :cond_0
    const/16 v0, 0x22

    :goto_0
    const v1, -0xff0001

    and-int/2addr v0, v1

    shl-int/lit8 p2, p2, 0x10

    const/high16 v1, 0xff0000

    and-int/2addr p2, v1

    or-int/2addr p2, v0

    .line 91
    iget-object v0, p0, Lcom/facebook/react/views/text/ReactBaseTextShadowNode$SetSpanOperation;->what:Lcom/facebook/react/views/text/ReactSpan;

    iget v1, p0, Lcom/facebook/react/views/text/ReactBaseTextShadowNode$SetSpanOperation;->start:I

    iget v2, p0, Lcom/facebook/react/views/text/ReactBaseTextShadowNode$SetSpanOperation;->end:I

    invoke-virtual {p1, v0, v1, v2, p2}, Landroid/text/SpannableStringBuilder;->setSpan(Ljava/lang/Object;III)V

    return-void
.end method
