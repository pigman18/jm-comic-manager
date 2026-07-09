.class public Lcom/facebook/react/views/text/ReactTagSpan;
.super Ljava/lang/Object;
.source "ReactTagSpan.java"

# interfaces
.implements Lcom/facebook/react/views/text/ReactSpan;


# instance fields
.field private final mReactTag:I


# direct methods
.method public constructor <init>(I)V
    .locals 0

    .line 18
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 19
    iput p1, p0, Lcom/facebook/react/views/text/ReactTagSpan;->mReactTag:I

    return-void
.end method


# virtual methods
.method public getReactTag()I
    .locals 1

    .line 23
    iget v0, p0, Lcom/facebook/react/views/text/ReactTagSpan;->mReactTag:I

    return v0
.end method
