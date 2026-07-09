.class public Lcom/facebook/react/views/art/ARTSurfaceView;
.super Landroid/view/TextureView;
.source "ARTSurfaceView.java"


# direct methods
.method public constructor <init>(Landroid/content/Context;)V
    .locals 0

    .line 16
    invoke-direct {p0, p1}, Landroid/view/TextureView;-><init>(Landroid/content/Context;)V

    const/4 p1, 0x0

    .line 17
    invoke-virtual {p0, p1}, Lcom/facebook/react/views/art/ARTSurfaceView;->setOpaque(Z)V

    return-void
.end method
