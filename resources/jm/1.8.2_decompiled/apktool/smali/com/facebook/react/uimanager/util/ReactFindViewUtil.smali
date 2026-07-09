.class public Lcom/facebook/react/uimanager/util/ReactFindViewUtil;
.super Ljava/lang/Object;
.source "ReactFindViewUtil.java"


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnMultipleViewsFoundListener;,
        Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnViewFoundListener;
    }
.end annotation


# static fields
.field private static final mOnMultipleViewsFoundListener:Ljava/util/Map;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/Map<",
            "Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnMultipleViewsFoundListener;",
            "Ljava/util/Set<",
            "Ljava/lang/String;",
            ">;>;"
        }
    .end annotation
.end field

.field private static final mOnViewFoundListeners:Ljava/util/List;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/List<",
            "Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnViewFoundListener;",
            ">;"
        }
    .end annotation
.end field


# direct methods
.method static constructor <clinit>()V
    .locals 1

    .line 24
    new-instance v0, Ljava/util/ArrayList;

    invoke-direct {v0}, Ljava/util/ArrayList;-><init>()V

    sput-object v0, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->mOnViewFoundListeners:Ljava/util/List;

    .line 26
    new-instance v0, Ljava/util/HashMap;

    invoke-direct {v0}, Ljava/util/HashMap;-><init>()V

    sput-object v0, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->mOnMultipleViewsFoundListener:Ljava/util/Map;

    return-void
.end method

.method public constructor <init>()V
    .locals 0

    .line 22
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method public static addViewListener(Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnViewFoundListener;)V
    .locals 1

    .line 98
    sget-object v0, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->mOnViewFoundListeners:Ljava/util/List;

    invoke-interface {v0, p0}, Ljava/util/List;->add(Ljava/lang/Object;)Z

    return-void
.end method

.method public static addViewsListener(Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnMultipleViewsFoundListener;Ljava/util/Set;)V
    .locals 1
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnMultipleViewsFoundListener;",
            "Ljava/util/Set<",
            "Ljava/lang/String;",
            ">;)V"
        }
    .end annotation

    .line 107
    sget-object v0, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->mOnMultipleViewsFoundListener:Ljava/util/Map;

    invoke-interface {v0, p0, p1}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    return-void
.end method

.method public static findView(Landroid/view/View;Ljava/lang/String;)Landroid/view/View;
    .locals 2

    .line 60
    invoke-static {p0}, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->getNativeId(Landroid/view/View;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_0

    .line 61
    invoke-virtual {v0, p1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_0

    return-object p0

    .line 65
    :cond_0
    instance-of v0, p0, Landroid/view/ViewGroup;

    if-eqz v0, :cond_2

    .line 66
    check-cast p0, Landroid/view/ViewGroup;

    const/4 v0, 0x0

    .line 67
    :goto_0
    invoke-virtual {p0}, Landroid/view/ViewGroup;->getChildCount()I

    move-result v1

    if-ge v0, v1, :cond_2

    .line 68
    invoke-virtual {p0, v0}, Landroid/view/ViewGroup;->getChildAt(I)Landroid/view/View;

    move-result-object v1

    invoke-static {v1, p1}, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->findView(Landroid/view/View;Ljava/lang/String;)Landroid/view/View;

    move-result-object v1

    if-eqz v1, :cond_1

    return-object v1

    :cond_1
    add-int/lit8 v0, v0, 0x1

    goto :goto_0

    :cond_2
    const/4 p0, 0x0

    return-object p0
.end method

.method public static findView(Landroid/view/View;Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnViewFoundListener;)V
    .locals 1

    .line 86
    invoke-interface {p1}, Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnViewFoundListener;->getNativeId()Ljava/lang/String;

    move-result-object v0

    invoke-static {p0, v0}, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->findView(Landroid/view/View;Ljava/lang/String;)Landroid/view/View;

    move-result-object p0

    if-eqz p0, :cond_0

    .line 88
    invoke-interface {p1, p0}, Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnViewFoundListener;->onViewFound(Landroid/view/View;)V

    .line 90
    :cond_0
    invoke-static {p1}, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->addViewListener(Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnViewFoundListener;)V

    return-void
.end method

.method private static getNativeId(Landroid/view/View;)Ljava/lang/String;
    .locals 1

    .line 139
    sget v0, Lcom/facebook/react/R$id;->view_tag_native_id:I

    invoke-virtual {p0, v0}, Landroid/view/View;->getTag(I)Ljava/lang/Object;

    move-result-object p0

    .line 140
    instance-of v0, p0, Ljava/lang/String;

    if-eqz v0, :cond_0

    check-cast p0, Ljava/lang/String;

    goto :goto_0

    :cond_0
    const/4 p0, 0x0

    :goto_0
    return-object p0
.end method

.method public static notifyViewRendered(Landroid/view/View;)V
    .locals 4

    .line 116
    invoke-static {p0}, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->getNativeId(Landroid/view/View;)Ljava/lang/String;

    move-result-object v0

    if-nez v0, :cond_0

    return-void

    .line 120
    :cond_0
    sget-object v1, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->mOnViewFoundListeners:Ljava/util/List;

    invoke-interface {v1}, Ljava/util/List;->iterator()Ljava/util/Iterator;

    move-result-object v1

    .line 121
    :cond_1
    :goto_0
    invoke-interface {v1}, Ljava/util/Iterator;->hasNext()Z

    move-result v2

    if-eqz v2, :cond_2

    .line 122
    invoke-interface {v1}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v2

    check-cast v2, Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnViewFoundListener;

    if-eqz v0, :cond_1

    .line 123
    invoke-interface {v2}, Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnViewFoundListener;->getNativeId()Ljava/lang/String;

    move-result-object v3

    invoke-virtual {v0, v3}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v3

    if-eqz v3, :cond_1

    .line 124
    invoke-interface {v2, p0}, Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnViewFoundListener;->onViewFound(Landroid/view/View;)V

    .line 125
    invoke-interface {v1}, Ljava/util/Iterator;->remove()V

    goto :goto_0

    .line 130
    :cond_2
    sget-object v1, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->mOnMultipleViewsFoundListener:Ljava/util/Map;

    invoke-interface {v1}, Ljava/util/Map;->entrySet()Ljava/util/Set;

    move-result-object v1

    invoke-interface {v1}, Ljava/util/Set;->iterator()Ljava/util/Iterator;

    move-result-object v1

    :cond_3
    :goto_1
    invoke-interface {v1}, Ljava/util/Iterator;->hasNext()Z

    move-result v2

    if-eqz v2, :cond_4

    invoke-interface {v1}, Ljava/util/Iterator;->next()Ljava/lang/Object;

    move-result-object v2

    check-cast v2, Ljava/util/Map$Entry;

    .line 131
    invoke-interface {v2}, Ljava/util/Map$Entry;->getValue()Ljava/lang/Object;

    move-result-object v3

    check-cast v3, Ljava/util/Set;

    if-eqz v3, :cond_3

    .line 132
    invoke-interface {v3, v0}, Ljava/util/Set;->contains(Ljava/lang/Object;)Z

    move-result v3

    if-eqz v3, :cond_3

    .line 133
    invoke-interface {v2}, Ljava/util/Map$Entry;->getKey()Ljava/lang/Object;

    move-result-object v2

    check-cast v2, Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnMultipleViewsFoundListener;

    invoke-interface {v2, p0, v0}, Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnMultipleViewsFoundListener;->onViewFound(Landroid/view/View;Ljava/lang/String;)V

    goto :goto_1

    :cond_4
    return-void
.end method

.method public static removeViewListener(Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnViewFoundListener;)V
    .locals 1

    .line 103
    sget-object v0, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->mOnViewFoundListeners:Ljava/util/List;

    invoke-interface {v0, p0}, Ljava/util/List;->remove(Ljava/lang/Object;)Z

    return-void
.end method

.method public static removeViewsListener(Lcom/facebook/react/uimanager/util/ReactFindViewUtil$OnMultipleViewsFoundListener;)V
    .locals 1

    .line 111
    sget-object v0, Lcom/facebook/react/uimanager/util/ReactFindViewUtil;->mOnMultipleViewsFoundListener:Ljava/util/Map;

    invoke-interface {v0, p0}, Ljava/util/Map;->remove(Ljava/lang/Object;)Ljava/lang/Object;

    return-void
.end method
