.class Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;
.super Landroidx/viewpager/widget/PagerAdapter;
.source "ReactViewPager.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/facebook/react/views/viewpager/ReactViewPager;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x2
    name = "Adapter"
.end annotation


# instance fields
.field private mIsViewPagerInIntentionallyInconsistentState:Z

.field private final mViews:Ljava/util/List;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/List<",
            "Landroid/view/View;",
            ">;"
        }
    .end annotation
.end field

.field final synthetic this$0:Lcom/facebook/react/views/viewpager/ReactViewPager;


# direct methods
.method private constructor <init>(Lcom/facebook/react/views/viewpager/ReactViewPager;)V
    .locals 0

    .line 31
    iput-object p1, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->this$0:Lcom/facebook/react/views/viewpager/ReactViewPager;

    invoke-direct {p0}, Landroidx/viewpager/widget/PagerAdapter;-><init>()V

    .line 33
    new-instance p1, Ljava/util/ArrayList;

    invoke-direct {p1}, Ljava/util/ArrayList;-><init>()V

    iput-object p1, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    const/4 p1, 0x0

    .line 34
    iput-boolean p1, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mIsViewPagerInIntentionallyInconsistentState:Z

    return-void
.end method

.method synthetic constructor <init>(Lcom/facebook/react/views/viewpager/ReactViewPager;Lcom/facebook/react/views/viewpager/ReactViewPager$1;)V
    .locals 0

    .line 31
    invoke-direct {p0, p1}, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;-><init>(Lcom/facebook/react/views/viewpager/ReactViewPager;)V

    return-void
.end method


# virtual methods
.method addView(Landroid/view/View;I)V
    .locals 1

    .line 37
    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    invoke-interface {v0, p2, p1}, Ljava/util/List;->add(ILjava/lang/Object;)V

    .line 38
    invoke-virtual {p0}, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->notifyDataSetChanged()V

    .line 47
    iget-object p1, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->this$0:Lcom/facebook/react/views/viewpager/ReactViewPager;

    iget-object p2, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    invoke-interface {p2}, Ljava/util/List;->size()I

    move-result p2

    invoke-virtual {p1, p2}, Lcom/facebook/react/views/viewpager/ReactViewPager;->setOffscreenPageLimit(I)V

    return-void
.end method

.method public destroyItem(Landroid/view/ViewGroup;ILjava/lang/Object;)V
    .locals 0

    .line 108
    check-cast p3, Landroid/view/View;

    invoke-virtual {p1, p3}, Landroid/view/ViewGroup;->removeView(Landroid/view/View;)V

    return-void
.end method

.method public getCount()I
    .locals 1

    .line 88
    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    invoke-interface {v0}, Ljava/util/List;->size()I

    move-result v0

    return v0
.end method

.method public getItemPosition(Ljava/lang/Object;)I
    .locals 1

    .line 94
    iget-boolean v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mIsViewPagerInIntentionallyInconsistentState:Z

    if-nez v0, :cond_1

    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    invoke-interface {v0, p1}, Ljava/util/List;->contains(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_0

    goto :goto_0

    :cond_0
    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    .line 96
    invoke-interface {v0, p1}, Ljava/util/List;->indexOf(Ljava/lang/Object;)I

    move-result p1

    goto :goto_1

    :cond_1
    :goto_0
    const/4 p1, -0x2

    :goto_1
    return p1
.end method

.method getViewAt(I)Landroid/view/View;
    .locals 1

    .line 83
    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    invoke-interface {v0, p1}, Ljava/util/List;->get(I)Ljava/lang/Object;

    move-result-object p1

    check-cast p1, Landroid/view/View;

    return-object p1
.end method

.method public instantiateItem(Landroid/view/ViewGroup;I)Ljava/lang/Object;
    .locals 2

    .line 101
    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    invoke-interface {v0, p2}, Ljava/util/List;->get(I)Ljava/lang/Object;

    move-result-object p2

    check-cast p2, Landroid/view/View;

    .line 102
    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->this$0:Lcom/facebook/react/views/viewpager/ReactViewPager;

    invoke-static {v0}, Lcom/facebook/react/views/viewpager/ReactViewPager;->access$000(Lcom/facebook/react/views/viewpager/ReactViewPager;)Landroid/view/ViewGroup$LayoutParams;

    move-result-object v0

    const/4 v1, 0x0

    invoke-virtual {p1, p2, v1, v0}, Landroid/view/ViewGroup;->addView(Landroid/view/View;ILandroid/view/ViewGroup$LayoutParams;)V

    return-object p2
.end method

.method public isViewFromObject(Landroid/view/View;Ljava/lang/Object;)Z
    .locals 0

    if-ne p1, p2, :cond_0

    const/4 p1, 0x1

    goto :goto_0

    :cond_0
    const/4 p1, 0x0

    :goto_0
    return p1
.end method

.method removeAllViewsFromAdapter(Landroidx/viewpager/widget/ViewPager;)V
    .locals 1

    .line 75
    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    invoke-interface {v0}, Ljava/util/List;->clear()V

    .line 76
    invoke-virtual {p1}, Landroidx/viewpager/widget/ViewPager;->removeAllViews()V

    const/4 p1, 0x1

    .line 79
    iput-boolean p1, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mIsViewPagerInIntentionallyInconsistentState:Z

    return-void
.end method

.method removeViewAt(I)V
    .locals 1

    .line 51
    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    invoke-interface {v0, p1}, Ljava/util/List;->remove(I)Ljava/lang/Object;

    .line 52
    invoke-virtual {p0}, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->notifyDataSetChanged()V

    .line 56
    iget-object p1, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->this$0:Lcom/facebook/react/views/viewpager/ReactViewPager;

    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    invoke-interface {v0}, Ljava/util/List;->size()I

    move-result v0

    invoke-virtual {p1, v0}, Lcom/facebook/react/views/viewpager/ReactViewPager;->setOffscreenPageLimit(I)V

    return-void
.end method

.method setViews(Ljava/util/List;)V
    .locals 1
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Ljava/util/List<",
            "Landroid/view/View;",
            ">;)V"
        }
    .end annotation

    .line 61
    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    invoke-interface {v0}, Ljava/util/List;->clear()V

    .line 62
    iget-object v0, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mViews:Ljava/util/List;

    invoke-interface {v0, p1}, Ljava/util/List;->addAll(Ljava/util/Collection;)Z

    .line 63
    invoke-virtual {p0}, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->notifyDataSetChanged()V

    const/4 p1, 0x0

    .line 67
    iput-boolean p1, p0, Lcom/facebook/react/views/viewpager/ReactViewPager$Adapter;->mIsViewPagerInIntentionallyInconsistentState:Z

    return-void
.end method
