.class public Lcom/facebook/react/views/modal/RNGHModalUtils;
.super Ljava/lang/Object;
.source "RNGHModalUtils.java"


# direct methods
.method public constructor <init>()V
    .locals 0

    .line 13
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method public static dialogRootViewGroupOnChildStartedNativeGesture(Landroid/view/ViewGroup;Landroid/view/MotionEvent;)V
    .locals 0

    .line 15
    check-cast p0, Lcom/facebook/react/views/modal/ReactModalHostView$DialogRootViewGroup;

    invoke-virtual {p0, p1}, Lcom/facebook/react/views/modal/ReactModalHostView$DialogRootViewGroup;->onChildStartedNativeGesture(Landroid/view/MotionEvent;)V

    return-void
.end method

.method public static isDialogRootViewGroup(Landroid/view/ViewParent;)Z
    .locals 0

    .line 19
    instance-of p0, p0, Lcom/facebook/react/views/modal/ReactModalHostView$DialogRootViewGroup;

    return p0
.end method
