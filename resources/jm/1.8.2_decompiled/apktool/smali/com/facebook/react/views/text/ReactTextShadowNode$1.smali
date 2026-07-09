.class Lcom/facebook/react/views/text/ReactTextShadowNode$1;
.super Ljava/lang/Object;
.source "ReactTextShadowNode.java"

# interfaces
.implements Lcom/facebook/yoga/YogaMeasureFunction;


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/facebook/react/views/text/ReactTextShadowNode;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation


# instance fields
.field final synthetic this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;


# direct methods
.method constructor <init>(Lcom/facebook/react/views/text/ReactTextShadowNode;)V
    .locals 0

    .line 62
    iput-object p1, p0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public measure(Lcom/facebook/yoga/YogaNode;FLcom/facebook/yoga/YogaMeasureMode;FLcom/facebook/yoga/YogaMeasureMode;)J
    .locals 17

    move-object/from16 v0, p0

    move/from16 v1, p2

    move-object/from16 v2, p3

    .line 70
    iget-object v3, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    .line 72
    invoke-static {v3}, Lcom/facebook/react/views/text/ReactTextShadowNode;->access$000(Lcom/facebook/react/views/text/ReactTextShadowNode;)Landroid/text/Spannable;

    move-result-object v3

    const-string v4, "Spannable element has not been prepared in onBeforeLayout"

    .line 71
    invoke-static {v3, v4}, Lcom/facebook/infer/annotation/Assertions;->assertNotNull(Ljava/lang/Object;Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v3

    check-cast v3, Landroid/text/Spannable;

    .line 75
    iget-object v4, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    invoke-static {v4, v3, v1, v2}, Lcom/facebook/react/views/text/ReactTextShadowNode;->access$100(Lcom/facebook/react/views/text/ReactTextShadowNode;Landroid/text/Spannable;FLcom/facebook/yoga/YogaMeasureMode;)Landroid/text/Layout;

    move-result-object v4

    .line 77
    iget-object v5, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    iget-boolean v5, v5, Lcom/facebook/react/views/text/ReactTextShadowNode;->mAdjustsFontSizeToFit:Z

    const/4 v6, -0x1

    if-eqz v5, :cond_3

    .line 78
    iget-object v5, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    iget-object v5, v5, Lcom/facebook/react/views/text/ReactTextShadowNode;->mTextAttributes:Lcom/facebook/react/views/text/TextAttributes;

    invoke-virtual {v5}, Lcom/facebook/react/views/text/TextAttributes;->getEffectiveFontSize()I

    move-result v5

    .line 79
    iget-object v7, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    iget-object v7, v7, Lcom/facebook/react/views/text/ReactTextShadowNode;->mTextAttributes:Lcom/facebook/react/views/text/TextAttributes;

    invoke-virtual {v7}, Lcom/facebook/react/views/text/TextAttributes;->getEffectiveFontSize()I

    move-result v7

    .line 81
    iget-object v8, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    iget v8, v8, Lcom/facebook/react/views/text/ReactTextShadowNode;->mMinimumFontScale:F

    int-to-float v5, v5

    mul-float v8, v8, v5

    const/high16 v9, 0x40800000    # 4.0f

    .line 82
    invoke-static {v9}, Lcom/facebook/react/uimanager/PixelUtil;->toPixelFromDIP(F)F

    move-result v9

    invoke-static {v8, v9}, Ljava/lang/Math;->max(FF)F

    move-result v8

    float-to-int v8, v8

    :goto_0
    if-le v7, v8, :cond_3

    .line 83
    iget-object v9, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    iget v9, v9, Lcom/facebook/react/views/text/ReactTextShadowNode;->mNumberOfLines:I

    if-eq v9, v6, :cond_1

    .line 84
    invoke-virtual {v4}, Landroid/text/Layout;->getLineCount()I

    move-result v9

    iget-object v10, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    iget v10, v10, Lcom/facebook/react/views/text/ReactTextShadowNode;->mNumberOfLines:I

    if-gt v9, v10, :cond_0

    goto :goto_1

    :cond_0
    move-object/from16 v10, p5

    goto :goto_2

    :cond_1
    :goto_1
    sget-object v9, Lcom/facebook/yoga/YogaMeasureMode;->UNDEFINED:Lcom/facebook/yoga/YogaMeasureMode;

    move-object/from16 v10, p5

    if-eq v10, v9, :cond_3

    .line 85
    invoke-virtual {v4}, Landroid/text/Layout;->getHeight()I

    move-result v9

    int-to-float v9, v9

    cmpl-float v9, v9, p4

    if-lez v9, :cond_3

    :goto_2
    const/high16 v4, 0x3f800000    # 1.0f

    .line 89
    invoke-static {v4}, Lcom/facebook/react/uimanager/PixelUtil;->toPixelFromDIP(F)F

    move-result v4

    float-to-int v4, v4

    sub-int/2addr v7, v4

    int-to-float v4, v7

    div-float/2addr v4, v5

    .line 93
    invoke-interface {v3}, Landroid/text/Spannable;->length()I

    move-result v9

    const-class v11, Lcom/facebook/react/views/text/ReactAbsoluteSizeSpan;

    const/4 v12, 0x0

    invoke-interface {v3, v12, v9, v11}, Landroid/text/Spannable;->getSpans(IILjava/lang/Class;)[Ljava/lang/Object;

    move-result-object v9

    check-cast v9, [Lcom/facebook/react/views/text/ReactAbsoluteSizeSpan;

    .line 94
    array-length v11, v9

    :goto_3
    if-ge v12, v11, :cond_2

    aget-object v13, v9, v12

    .line 95
    new-instance v14, Lcom/facebook/react/views/text/ReactAbsoluteSizeSpan;

    .line 97
    invoke-virtual {v13}, Lcom/facebook/react/views/text/ReactAbsoluteSizeSpan;->getSize()I

    move-result v15

    int-to-float v15, v15

    mul-float v15, v15, v4

    int-to-float v6, v8

    invoke-static {v15, v6}, Ljava/lang/Math;->max(FF)F

    move-result v6

    float-to-int v6, v6

    invoke-direct {v14, v6}, Lcom/facebook/react/views/text/ReactAbsoluteSizeSpan;-><init>(I)V

    .line 98
    invoke-interface {v3, v13}, Landroid/text/Spannable;->getSpanStart(Ljava/lang/Object;)I

    move-result v6

    .line 99
    invoke-interface {v3, v13}, Landroid/text/Spannable;->getSpanEnd(Ljava/lang/Object;)I

    move-result v15

    move/from16 v16, v4

    .line 100
    invoke-interface {v3, v13}, Landroid/text/Spannable;->getSpanFlags(Ljava/lang/Object;)I

    move-result v4

    .line 95
    invoke-interface {v3, v14, v6, v15, v4}, Landroid/text/Spannable;->setSpan(Ljava/lang/Object;III)V

    .line 101
    invoke-interface {v3, v13}, Landroid/text/Spannable;->removeSpan(Ljava/lang/Object;)V

    add-int/lit8 v12, v12, 0x1

    move/from16 v4, v16

    const/4 v6, -0x1

    goto :goto_3

    .line 103
    :cond_2
    iget-object v4, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    invoke-static {v4, v3, v1, v2}, Lcom/facebook/react/views/text/ReactTextShadowNode;->access$100(Lcom/facebook/react/views/text/ReactTextShadowNode;Landroid/text/Spannable;FLcom/facebook/yoga/YogaMeasureMode;)Landroid/text/Layout;

    move-result-object v4

    const/4 v6, -0x1

    goto :goto_0

    .line 107
    :cond_3
    iget-object v1, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    invoke-static {v1}, Lcom/facebook/react/views/text/ReactTextShadowNode;->access$200(Lcom/facebook/react/views/text/ReactTextShadowNode;)Z

    move-result v1

    if-eqz v1, :cond_5

    .line 108
    iget-object v1, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    invoke-virtual {v1}, Lcom/facebook/react/views/text/ReactTextShadowNode;->getThemedContext()Lcom/facebook/react/uimanager/ThemedReactContext;

    move-result-object v1

    .line 111
    invoke-static {}, Lcom/facebook/react/views/text/ReactTextShadowNode;->access$300()Landroid/text/TextPaint;

    move-result-object v2

    .line 110
    invoke-static {v3, v4, v2, v1}, Lcom/facebook/react/views/text/FontMetricsUtil;->getFontMetrics(Ljava/lang/CharSequence;Landroid/text/Layout;Landroid/text/TextPaint;Landroid/content/Context;)Lcom/facebook/react/bridge/WritableArray;

    move-result-object v2

    .line 112
    invoke-static {}, Lcom/facebook/react/bridge/Arguments;->createMap()Lcom/facebook/react/bridge/WritableMap;

    move-result-object v3

    const-string v5, "lines"

    .line 113
    invoke-interface {v3, v5, v2}, Lcom/facebook/react/bridge/WritableMap;->putArray(Ljava/lang/String;Lcom/facebook/react/bridge/ReadableArray;)V

    .line 114
    invoke-virtual {v1}, Lcom/facebook/react/uimanager/ThemedReactContext;->hasActiveCatalystInstance()Z

    move-result v2

    if-eqz v2, :cond_4

    .line 115
    const-class v2, Lcom/facebook/react/uimanager/events/RCTEventEmitter;

    .line 116
    invoke-virtual {v1, v2}, Lcom/facebook/react/uimanager/ThemedReactContext;->getJSModule(Ljava/lang/Class;)Lcom/facebook/react/bridge/JavaScriptModule;

    move-result-object v1

    check-cast v1, Lcom/facebook/react/uimanager/events/RCTEventEmitter;

    iget-object v2, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    .line 117
    invoke-virtual {v2}, Lcom/facebook/react/views/text/ReactTextShadowNode;->getReactTag()I

    move-result v2

    const-string v5, "topTextLayout"

    invoke-interface {v1, v2, v5, v3}, Lcom/facebook/react/uimanager/events/RCTEventEmitter;->receiveEvent(ILjava/lang/String;Lcom/facebook/react/bridge/WritableMap;)V

    goto :goto_4

    .line 119
    :cond_4
    new-instance v1, Lcom/facebook/react/bridge/ReactNoCrashSoftException;

    const-string v2, "Cannot get RCTEventEmitter, no CatalystInstance"

    invoke-direct {v1, v2}, Lcom/facebook/react/bridge/ReactNoCrashSoftException;-><init>(Ljava/lang/String;)V

    const-string v2, "ReactTextShadowNode"

    invoke-static {v2, v1}, Lcom/facebook/react/bridge/ReactSoftException;->logSoftException(Ljava/lang/String;Ljava/lang/Throwable;)V

    .line 125
    :cond_5
    :goto_4
    iget-object v1, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    iget v1, v1, Lcom/facebook/react/views/text/ReactTextShadowNode;->mNumberOfLines:I

    const/4 v2, -0x1

    if-eq v1, v2, :cond_6

    iget-object v1, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    iget v1, v1, Lcom/facebook/react/views/text/ReactTextShadowNode;->mNumberOfLines:I

    invoke-virtual {v4}, Landroid/text/Layout;->getLineCount()I

    move-result v2

    if-ge v1, v2, :cond_6

    .line 127
    invoke-virtual {v4}, Landroid/text/Layout;->getWidth()I

    move-result v1

    iget-object v2, v0, Lcom/facebook/react/views/text/ReactTextShadowNode$1;->this$0:Lcom/facebook/react/views/text/ReactTextShadowNode;

    iget v2, v2, Lcom/facebook/react/views/text/ReactTextShadowNode;->mNumberOfLines:I

    add-int/lit8 v2, v2, -0x1

    invoke-virtual {v4, v2}, Landroid/text/Layout;->getLineBottom(I)I

    move-result v2

    .line 126
    invoke-static {v1, v2}, Lcom/facebook/yoga/YogaMeasureOutput;->make(II)J

    move-result-wide v1

    return-wide v1

    .line 129
    :cond_6
    invoke-virtual {v4}, Landroid/text/Layout;->getWidth()I

    move-result v1

    invoke-virtual {v4}, Landroid/text/Layout;->getHeight()I

    move-result v2

    invoke-static {v1, v2}, Lcom/facebook/yoga/YogaMeasureOutput;->make(II)J

    move-result-wide v1

    return-wide v1
.end method
