.class public Lcom/facebook/react/views/text/ShadowStyleSpan;
.super Landroid/text/style/CharacterStyle;
.source "ShadowStyleSpan.java"

# interfaces
.implements Lcom/facebook/react/views/text/ReactSpan;


# instance fields
.field private final mColor:I

.field private final mDx:F

.field private final mDy:F

.field private final mRadius:F


# direct methods
.method public constructor <init>(FFFI)V
    .locals 0

    .line 17
    invoke-direct {p0}, Landroid/text/style/CharacterStyle;-><init>()V

    .line 18
    iput p1, p0, Lcom/facebook/react/views/text/ShadowStyleSpan;->mDx:F

    .line 19
    iput p2, p0, Lcom/facebook/react/views/text/ShadowStyleSpan;->mDy:F

    .line 20
    iput p3, p0, Lcom/facebook/react/views/text/ShadowStyleSpan;->mRadius:F

    .line 21
    iput p4, p0, Lcom/facebook/react/views/text/ShadowStyleSpan;->mColor:I

    return-void
.end method


# virtual methods
.method public updateDrawState(Landroid/text/TextPaint;)V
    .locals 4

    .line 26
    iget v0, p0, Lcom/facebook/react/views/text/ShadowStyleSpan;->mRadius:F

    iget v1, p0, Lcom/facebook/react/views/text/ShadowStyleSpan;->mDx:F

    iget v2, p0, Lcom/facebook/react/views/text/ShadowStyleSpan;->mDy:F

    iget v3, p0, Lcom/facebook/react/views/text/ShadowStyleSpan;->mColor:I

    invoke-virtual {p1, v0, v1, v2, v3}, Landroid/text/TextPaint;->setShadowLayer(FFFI)V

    return-void
.end method
