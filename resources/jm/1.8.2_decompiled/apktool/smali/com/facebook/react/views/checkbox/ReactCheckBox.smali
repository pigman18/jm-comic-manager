.class Lcom/facebook/react/views/checkbox/ReactCheckBox;
.super Landroidx/appcompat/widget/AppCompatCheckBox;
.source "ReactCheckBox.java"


# instance fields
.field private mAllowChange:Z


# direct methods
.method public constructor <init>(Landroid/content/Context;)V
    .locals 0

    .line 19
    invoke-direct {p0, p1}, Landroidx/appcompat/widget/AppCompatCheckBox;-><init>(Landroid/content/Context;)V

    const/4 p1, 0x1

    .line 20
    iput-boolean p1, p0, Lcom/facebook/react/views/checkbox/ReactCheckBox;->mAllowChange:Z

    return-void
.end method


# virtual methods
.method public setChecked(Z)V
    .locals 1

    .line 25
    iget-boolean v0, p0, Lcom/facebook/react/views/checkbox/ReactCheckBox;->mAllowChange:Z

    if-eqz v0, :cond_0

    const/4 v0, 0x0

    .line 26
    iput-boolean v0, p0, Lcom/facebook/react/views/checkbox/ReactCheckBox;->mAllowChange:Z

    .line 27
    invoke-super {p0, p1}, Landroidx/appcompat/widget/AppCompatCheckBox;->setChecked(Z)V

    :cond_0
    return-void
.end method

.method setOn(Z)V
    .locals 1

    .line 33
    invoke-virtual {p0}, Lcom/facebook/react/views/checkbox/ReactCheckBox;->isChecked()Z

    move-result v0

    if-eq v0, p1, :cond_0

    .line 34
    invoke-super {p0, p1}, Landroidx/appcompat/widget/AppCompatCheckBox;->setChecked(Z)V

    :cond_0
    const/4 p1, 0x1

    .line 36
    iput-boolean p1, p0, Lcom/facebook/react/views/checkbox/ReactCheckBox;->mAllowChange:Z

    return-void
.end method
