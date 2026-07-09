.class public Lcom/facebook/react/fabric/events/FabricEventEmitter;
.super Ljava/lang/Object;
.source "FabricEventEmitter.java"

# interfaces
.implements Lcom/facebook/react/uimanager/events/RCTEventEmitter;


# static fields
.field private static final TAG:Ljava/lang/String; = "FabricEventEmitter"


# instance fields
.field private final mUIManager:Lcom/facebook/react/fabric/FabricUIManager;


# direct methods
.method public constructor <init>(Lcom/facebook/react/fabric/FabricUIManager;)V
    .locals 0

    .line 37
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    .line 38
    iput-object p1, p0, Lcom/facebook/react/fabric/events/FabricEventEmitter;->mUIManager:Lcom/facebook/react/fabric/FabricUIManager;

    return-void
.end method

.method private copyWritableArray(Lcom/facebook/react/bridge/WritableArray;)Lcom/facebook/react/bridge/WritableArray;
    .locals 3

    .line 86
    new-instance v0, Lcom/facebook/react/bridge/WritableNativeArray;

    invoke-direct {v0}, Lcom/facebook/react/bridge/WritableNativeArray;-><init>()V

    const/4 v1, 0x0

    .line 87
    :goto_0
    invoke-interface {p1}, Lcom/facebook/react/bridge/WritableArray;->size()I

    move-result v2

    if-ge v1, v2, :cond_0

    .line 88
    invoke-interface {p1, v1}, Lcom/facebook/react/bridge/WritableArray;->getMap(I)Lcom/facebook/react/bridge/ReadableMap;

    move-result-object v2

    invoke-direct {p0, v2}, Lcom/facebook/react/fabric/events/FabricEventEmitter;->getWritableMap(Lcom/facebook/react/bridge/ReadableMap;)Lcom/facebook/react/bridge/WritableMap;

    move-result-object v2

    invoke-virtual {v0, v2}, Lcom/facebook/react/bridge/WritableNativeArray;->pushMap(Lcom/facebook/react/bridge/ReadableMap;)V

    add-int/lit8 v1, v1, 0x1

    goto :goto_0

    :cond_0
    return-object v0
.end method

.method private getWritableMap(Lcom/facebook/react/bridge/ReadableMap;)Lcom/facebook/react/bridge/WritableMap;
    .locals 1

    .line 153
    new-instance v0, Lcom/facebook/react/bridge/WritableNativeMap;

    invoke-direct {v0}, Lcom/facebook/react/bridge/WritableNativeMap;-><init>()V

    .line 154
    invoke-virtual {v0, p1}, Lcom/facebook/react/bridge/WritableNativeMap;->merge(Lcom/facebook/react/bridge/ReadableMap;)V

    return-object v0
.end method

.method private removeTouchesAtIndices(Lcom/facebook/react/bridge/WritableArray;Lcom/facebook/react/bridge/WritableArray;)Landroid/util/Pair;
    .locals 7
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Lcom/facebook/react/bridge/WritableArray;",
            "Lcom/facebook/react/bridge/WritableArray;",
            ")",
            "Landroid/util/Pair<",
            "Lcom/facebook/react/bridge/WritableArray;",
            "Lcom/facebook/react/bridge/WritableArray;",
            ">;"
        }
    .end annotation

    .line 109
    new-instance v0, Lcom/facebook/react/bridge/WritableNativeArray;

    invoke-direct {v0}, Lcom/facebook/react/bridge/WritableNativeArray;-><init>()V

    .line 112
    new-instance v1, Lcom/facebook/react/bridge/WritableNativeArray;

    invoke-direct {v1}, Lcom/facebook/react/bridge/WritableNativeArray;-><init>()V

    .line 113
    new-instance v2, Ljava/util/HashSet;

    invoke-direct {v2}, Ljava/util/HashSet;-><init>()V

    const/4 v3, 0x0

    const/4 v4, 0x0

    .line 114
    :goto_0
    invoke-interface {p2}, Lcom/facebook/react/bridge/WritableArray;->size()I

    move-result v5

    if-ge v4, v5, :cond_0

    .line 115
    invoke-interface {p2, v4}, Lcom/facebook/react/bridge/WritableArray;->getInt(I)I

    move-result v5

    .line 116
    invoke-interface {p1, v5}, Lcom/facebook/react/bridge/WritableArray;->getMap(I)Lcom/facebook/react/bridge/ReadableMap;

    move-result-object v6

    invoke-direct {p0, v6}, Lcom/facebook/react/fabric/events/FabricEventEmitter;->getWritableMap(Lcom/facebook/react/bridge/ReadableMap;)Lcom/facebook/react/bridge/WritableMap;

    move-result-object v6

    invoke-interface {v0, v6}, Lcom/facebook/react/bridge/WritableArray;->pushMap(Lcom/facebook/react/bridge/ReadableMap;)V

    .line 117
    invoke-static {v5}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object v5

    invoke-interface {v2, v5}, Ljava/util/Set;->add(Ljava/lang/Object;)Z

    add-int/lit8 v4, v4, 0x1

    goto :goto_0

    .line 119
    :cond_0
    :goto_1
    invoke-interface {p1}, Lcom/facebook/react/bridge/WritableArray;->size()I

    move-result p2

    if-ge v3, p2, :cond_2

    .line 120
    invoke-static {v3}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;

    move-result-object p2

    invoke-interface {v2, p2}, Ljava/util/Set;->contains(Ljava/lang/Object;)Z

    move-result p2

    if-nez p2, :cond_1

    .line 121
    invoke-interface {p1, v3}, Lcom/facebook/react/bridge/WritableArray;->getMap(I)Lcom/facebook/react/bridge/ReadableMap;

    move-result-object p2

    invoke-direct {p0, p2}, Lcom/facebook/react/fabric/events/FabricEventEmitter;->getWritableMap(Lcom/facebook/react/bridge/ReadableMap;)Lcom/facebook/react/bridge/WritableMap;

    move-result-object p2

    invoke-interface {v1, p2}, Lcom/facebook/react/bridge/WritableArray;->pushMap(Lcom/facebook/react/bridge/ReadableMap;)V

    :cond_1
    add-int/lit8 v3, v3, 0x1

    goto :goto_1

    .line 125
    :cond_2
    new-instance p1, Landroid/util/Pair;

    invoke-direct {p1, v0, v1}, Landroid/util/Pair;-><init>(Ljava/lang/Object;Ljava/lang/Object;)V

    return-object p1
.end method

.method private touchSubsequence(Lcom/facebook/react/bridge/WritableArray;Lcom/facebook/react/bridge/WritableArray;)Landroid/util/Pair;
    .locals 3
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "(",
            "Lcom/facebook/react/bridge/WritableArray;",
            "Lcom/facebook/react/bridge/WritableArray;",
            ")",
            "Landroid/util/Pair<",
            "Lcom/facebook/react/bridge/WritableArray;",
            "Lcom/facebook/react/bridge/WritableArray;",
            ">;"
        }
    .end annotation

    .line 139
    new-instance v0, Lcom/facebook/react/bridge/WritableNativeArray;

    invoke-direct {v0}, Lcom/facebook/react/bridge/WritableNativeArray;-><init>()V

    const/4 v1, 0x0

    .line 140
    :goto_0
    invoke-interface {p2}, Lcom/facebook/react/bridge/WritableArray;->size()I

    move-result v2

    if-ge v1, v2, :cond_0

    .line 141
    invoke-interface {p2, v1}, Lcom/facebook/react/bridge/WritableArray;->getInt(I)I

    move-result v2

    invoke-interface {p1, v2}, Lcom/facebook/react/bridge/WritableArray;->getMap(I)Lcom/facebook/react/bridge/ReadableMap;

    move-result-object v2

    invoke-direct {p0, v2}, Lcom/facebook/react/fabric/events/FabricEventEmitter;->getWritableMap(Lcom/facebook/react/bridge/ReadableMap;)Lcom/facebook/react/bridge/WritableMap;

    move-result-object v2

    invoke-interface {v0, v2}, Lcom/facebook/react/bridge/WritableArray;->pushMap(Lcom/facebook/react/bridge/ReadableMap;)V

    add-int/lit8 v1, v1, 0x1

    goto :goto_0

    .line 143
    :cond_0
    new-instance p2, Landroid/util/Pair;

    invoke-direct {p2, v0, p1}, Landroid/util/Pair;-><init>(Ljava/lang/Object;Ljava/lang/Object;)V

    return-object p2
.end method


# virtual methods
.method public receiveEvent(ILjava/lang/String;Lcom/facebook/react/bridge/WritableMap;)V
    .locals 3

    .line 43
    new-instance v0, Ljava/lang/StringBuilder;

    invoke-direct {v0}, Ljava/lang/StringBuilder;-><init>()V

    const-string v1, "FabricEventEmitter.receiveEvent(\'"

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v1, "\')"

    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v0

    const-wide/16 v1, 0x0

    invoke-static {v1, v2, v0}, Lcom/facebook/systrace/Systrace;->beginSection(JLjava/lang/String;)V

    .line 46
    iget-object v0, p0, Lcom/facebook/react/fabric/events/FabricEventEmitter;->mUIManager:Lcom/facebook/react/fabric/FabricUIManager;

    invoke-virtual {v0, p1, p2, p3}, Lcom/facebook/react/fabric/FabricUIManager;->receiveEvent(ILjava/lang/String;Lcom/facebook/react/bridge/WritableMap;)V

    .line 47
    invoke-static {v1, v2}, Lcom/facebook/systrace/Systrace;->endSection(J)V

    return-void
.end method

.method public receiveTouches(Ljava/lang/String;Lcom/facebook/react/bridge/WritableArray;Lcom/facebook/react/bridge/WritableArray;)V
    .locals 5

    const-string v0, "topTouchEnd"

    .line 56
    invoke-virtual {v0, p1}, Ljava/lang/String;->equalsIgnoreCase(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_1

    const-string v0, "topTouchCancel"

    .line 57
    invoke-virtual {v0, p1}, Ljava/lang/String;->equalsIgnoreCase(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    .line 59
    :cond_0
    invoke-direct {p0, p2, p3}, Lcom/facebook/react/fabric/events/FabricEventEmitter;->touchSubsequence(Lcom/facebook/react/bridge/WritableArray;Lcom/facebook/react/bridge/WritableArray;)Landroid/util/Pair;

    move-result-object p2

    goto :goto_1

    .line 58
    :cond_1
    :goto_0
    invoke-direct {p0, p2, p3}, Lcom/facebook/react/fabric/events/FabricEventEmitter;->removeTouchesAtIndices(Lcom/facebook/react/bridge/WritableArray;Lcom/facebook/react/bridge/WritableArray;)Landroid/util/Pair;

    move-result-object p2

    .line 61
    :goto_1
    iget-object p3, p2, Landroid/util/Pair;->first:Ljava/lang/Object;

    check-cast p3, Lcom/facebook/react/bridge/WritableArray;

    .line 62
    iget-object p2, p2, Landroid/util/Pair;->second:Ljava/lang/Object;

    check-cast p2, Lcom/facebook/react/bridge/WritableArray;

    const/4 v0, 0x0

    const/4 v1, 0x0

    .line 64
    :goto_2
    invoke-interface {p3}, Lcom/facebook/react/bridge/WritableArray;->size()I

    move-result v2

    if-ge v1, v2, :cond_3

    .line 65
    invoke-interface {p3, v1}, Lcom/facebook/react/bridge/WritableArray;->getMap(I)Lcom/facebook/react/bridge/ReadableMap;

    move-result-object v2

    invoke-direct {p0, v2}, Lcom/facebook/react/fabric/events/FabricEventEmitter;->getWritableMap(Lcom/facebook/react/bridge/ReadableMap;)Lcom/facebook/react/bridge/WritableMap;

    move-result-object v2

    .line 69
    invoke-direct {p0, p3}, Lcom/facebook/react/fabric/events/FabricEventEmitter;->copyWritableArray(Lcom/facebook/react/bridge/WritableArray;)Lcom/facebook/react/bridge/WritableArray;

    move-result-object v3

    const-string v4, "changedTouches"

    invoke-interface {v2, v4, v3}, Lcom/facebook/react/bridge/WritableMap;->putArray(Ljava/lang/String;Lcom/facebook/react/bridge/ReadableArray;)V

    .line 70
    invoke-direct {p0, p2}, Lcom/facebook/react/fabric/events/FabricEventEmitter;->copyWritableArray(Lcom/facebook/react/bridge/WritableArray;)Lcom/facebook/react/bridge/WritableArray;

    move-result-object v3

    const-string v4, "touches"

    invoke-interface {v2, v4, v3}, Lcom/facebook/react/bridge/WritableMap;->putArray(Ljava/lang/String;Lcom/facebook/react/bridge/ReadableArray;)V

    const-string v3, "target"

    .line 73
    invoke-interface {v2, v3}, Lcom/facebook/react/bridge/WritableMap;->getInt(Ljava/lang/String;)I

    move-result v3

    const/4 v4, 0x1

    if-ge v3, v4, :cond_2

    const-string v3, "FabricEventEmitter"

    const-string v4, "A view is reporting that a touch occurred on tag zero."

    .line 75
    invoke-static {v3, v4}, Lcom/facebook/common/logging/FLog;->e(Ljava/lang/String;Ljava/lang/String;)V

    const/4 v3, 0x0

    .line 80
    :cond_2
    invoke-virtual {p0, v3, p1, v2}, Lcom/facebook/react/fabric/events/FabricEventEmitter;->receiveEvent(ILjava/lang/String;Lcom/facebook/react/bridge/WritableMap;)V

    add-int/lit8 v1, v1, 0x1

    goto :goto_2

    :cond_3
    return-void
.end method
