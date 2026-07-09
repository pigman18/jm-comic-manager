.class Lcom/facebook/react/views/picker/ReactPickerAdapter;
.super Landroid/widget/ArrayAdapter;
.source "ReactPickerAdapter.java"


# annotations
.annotation system Ldalvik/annotation/Signature;
    value = {
        "Landroid/widget/ArrayAdapter<",
        "Lcom/facebook/react/views/picker/ReactPickerItem;",
        ">;"
    }
.end annotation


# instance fields
.field private mBackgroundColor:Ljava/lang/Integer;

.field private final mInflater:Landroid/view/LayoutInflater;

.field private mPrimaryTextColor:Ljava/lang/Integer;


# direct methods
.method public constructor <init>(Landroid/content/Context;Ljava/util/List;)V
    .locals 1
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Landroid/content/Context;",
            "Ljava/util/List<",
            "Lcom/facebook/react/views/picker/ReactPickerItem;",
            ">;)V"
        }
    .end annotation

    const/4 v0, 0x0

    .line 29
    invoke-direct {p0, p1, v0, p2}, Landroid/widget/ArrayAdapter;-><init>(Landroid/content/Context;ILjava/util/List;)V

    const-string p2, "layout_inflater"

    .line 33
    invoke-virtual {p1, p2}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object p1

    invoke-static {p1}, Lcom/facebook/infer/annotation/Assertions;->assertNotNull(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object p1

    check-cast p1, Landroid/view/LayoutInflater;

    iput-object p1, p0, Lcom/facebook/react/views/picker/ReactPickerAdapter;->mInflater:Landroid/view/LayoutInflater;

    return-void
.end method

.method private getView(ILandroid/view/View;Landroid/view/ViewGroup;Z)Landroid/view/View;
    .locals 2

    .line 47
    invoke-virtual {p0, p1}, Lcom/facebook/react/views/picker/ReactPickerAdapter;->getItem(I)Ljava/lang/Object;

    move-result-object p1

    check-cast p1, Lcom/facebook/react/views/picker/ReactPickerItem;

    const/4 v0, 0x0

    if-nez p2, :cond_1

    if-eqz p4, :cond_0

    const p2, 0x1090009

    goto :goto_0

    :cond_0
    const p2, 0x1090008

    .line 54
    :goto_0
    iget-object v1, p0, Lcom/facebook/react/views/picker/ReactPickerAdapter;->mInflater:Landroid/view/LayoutInflater;

    invoke-virtual {v1, p2, p3, v0}, Landroid/view/LayoutInflater;->inflate(ILandroid/view/ViewGroup;Z)Landroid/view/View;

    move-result-object p2

    .line 56
    move-object p3, p2

    check-cast p3, Landroid/widget/TextView;

    invoke-virtual {p3}, Landroid/widget/TextView;->getTextColors()Landroid/content/res/ColorStateList;

    move-result-object p3

    invoke-virtual {p2, p3}, Landroid/view/View;->setTag(Ljava/lang/Object;)V

    const/4 v0, 0x1

    .line 60
    :cond_1
    check-cast p2, Landroid/widget/TextView;

    .line 61
    iget-object p3, p1, Lcom/facebook/react/views/picker/ReactPickerItem;->label:Ljava/lang/String;

    invoke-virtual {p2, p3}, Landroid/widget/TextView;->setText(Ljava/lang/CharSequence;)V

    if-nez p4, :cond_2

    .line 62
    iget-object p3, p0, Lcom/facebook/react/views/picker/ReactPickerAdapter;->mPrimaryTextColor:Ljava/lang/Integer;

    if-eqz p3, :cond_2

    .line 63
    invoke-virtual {p3}, Ljava/lang/Integer;->intValue()I

    move-result p1

    invoke-virtual {p2, p1}, Landroid/widget/TextView;->setTextColor(I)V

    goto :goto_1

    .line 64
    :cond_2
    iget-object p3, p1, Lcom/facebook/react/views/picker/ReactPickerItem;->color:Ljava/lang/Integer;

    if-eqz p3, :cond_3

    .line 65
    iget-object p1, p1, Lcom/facebook/react/views/picker/ReactPickerItem;->color:Ljava/lang/Integer;

    invoke-virtual {p1}, Ljava/lang/Integer;->intValue()I

    move-result p1

    invoke-virtual {p2, p1}, Landroid/widget/TextView;->setTextColor(I)V

    goto :goto_1

    .line 66
    :cond_3
    invoke-virtual {p2}, Landroid/widget/TextView;->getTag()Ljava/lang/Object;

    move-result-object p1

    if-eqz p1, :cond_4

    if-nez v0, :cond_4

    .line 68
    invoke-virtual {p2}, Landroid/widget/TextView;->getTag()Ljava/lang/Object;

    move-result-object p1

    check-cast p1, Landroid/content/res/ColorStateList;

    invoke-virtual {p2, p1}, Landroid/widget/TextView;->setTextColor(Landroid/content/res/ColorStateList;)V

    .line 71
    :cond_4
    :goto_1
    iget-object p1, p0, Lcom/facebook/react/views/picker/ReactPickerAdapter;->mBackgroundColor:Ljava/lang/Integer;

    if-eqz p1, :cond_5

    .line 72
    invoke-virtual {p1}, Ljava/lang/Integer;->intValue()I

    move-result p1

    invoke-virtual {p2, p1}, Landroid/widget/TextView;->setBackgroundColor(I)V

    :cond_5
    return-object p2
.end method


# virtual methods
.method public getBackgroundColor()Ljava/lang/Integer;
    .locals 1

    .line 83
    iget-object v0, p0, Lcom/facebook/react/views/picker/ReactPickerAdapter;->mBackgroundColor:Ljava/lang/Integer;

    return-object v0
.end method

.method public getDropDownView(ILandroid/view/View;Landroid/view/ViewGroup;)Landroid/view/View;
    .locals 1

    const/4 v0, 0x1

    .line 43
    invoke-direct {p0, p1, p2, p3, v0}, Lcom/facebook/react/views/picker/ReactPickerAdapter;->getView(ILandroid/view/View;Landroid/view/ViewGroup;Z)Landroid/view/View;

    move-result-object p1

    return-object p1
.end method

.method public getPrimaryTextColor()Ljava/lang/Integer;
    .locals 1

    .line 79
    iget-object v0, p0, Lcom/facebook/react/views/picker/ReactPickerAdapter;->mPrimaryTextColor:Ljava/lang/Integer;

    return-object v0
.end method

.method public getView(ILandroid/view/View;Landroid/view/ViewGroup;)Landroid/view/View;
    .locals 1

    const/4 v0, 0x0

    .line 38
    invoke-direct {p0, p1, p2, p3, v0}, Lcom/facebook/react/views/picker/ReactPickerAdapter;->getView(ILandroid/view/View;Landroid/view/ViewGroup;Z)Landroid/view/View;

    move-result-object p1

    return-object p1
.end method

.method public setBackgroundColor(Ljava/lang/Integer;)V
    .locals 0

    .line 92
    iput-object p1, p0, Lcom/facebook/react/views/picker/ReactPickerAdapter;->mBackgroundColor:Ljava/lang/Integer;

    .line 93
    invoke-virtual {p0}, Lcom/facebook/react/views/picker/ReactPickerAdapter;->notifyDataSetChanged()V

    return-void
.end method

.method public setPrimaryTextColor(Ljava/lang/Integer;)V
    .locals 0

    .line 87
    iput-object p1, p0, Lcom/facebook/react/views/picker/ReactPickerAdapter;->mPrimaryTextColor:Ljava/lang/Integer;

    .line 88
    invoke-virtual {p0}, Lcom/facebook/react/views/picker/ReactPickerAdapter;->notifyDataSetChanged()V

    return-void
.end method
