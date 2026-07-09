.class public final enum Lcom/facebook/react/views/image/ImageResizeMethod;
.super Ljava/lang/Enum;
.source "ImageResizeMethod.java"


# annotations
.annotation system Ldalvik/annotation/Signature;
    value = {
        "Ljava/lang/Enum<",
        "Lcom/facebook/react/views/image/ImageResizeMethod;",
        ">;"
    }
.end annotation


# static fields
.field private static final synthetic $VALUES:[Lcom/facebook/react/views/image/ImageResizeMethod;

.field public static final enum AUTO:Lcom/facebook/react/views/image/ImageResizeMethod;

.field public static final enum RESIZE:Lcom/facebook/react/views/image/ImageResizeMethod;

.field public static final enum SCALE:Lcom/facebook/react/views/image/ImageResizeMethod;


# direct methods
.method static constructor <clinit>()V
    .locals 5

    .line 11
    new-instance v0, Lcom/facebook/react/views/image/ImageResizeMethod;

    const/4 v1, 0x0

    const-string v2, "AUTO"

    invoke-direct {v0, v2, v1}, Lcom/facebook/react/views/image/ImageResizeMethod;-><init>(Ljava/lang/String;I)V

    sput-object v0, Lcom/facebook/react/views/image/ImageResizeMethod;->AUTO:Lcom/facebook/react/views/image/ImageResizeMethod;

    .line 12
    new-instance v0, Lcom/facebook/react/views/image/ImageResizeMethod;

    const/4 v2, 0x1

    const-string v3, "RESIZE"

    invoke-direct {v0, v3, v2}, Lcom/facebook/react/views/image/ImageResizeMethod;-><init>(Ljava/lang/String;I)V

    sput-object v0, Lcom/facebook/react/views/image/ImageResizeMethod;->RESIZE:Lcom/facebook/react/views/image/ImageResizeMethod;

    .line 13
    new-instance v0, Lcom/facebook/react/views/image/ImageResizeMethod;

    const/4 v3, 0x2

    const-string v4, "SCALE"

    invoke-direct {v0, v4, v3}, Lcom/facebook/react/views/image/ImageResizeMethod;-><init>(Ljava/lang/String;I)V

    sput-object v0, Lcom/facebook/react/views/image/ImageResizeMethod;->SCALE:Lcom/facebook/react/views/image/ImageResizeMethod;

    const/4 v0, 0x3

    new-array v0, v0, [Lcom/facebook/react/views/image/ImageResizeMethod;

    .line 10
    sget-object v4, Lcom/facebook/react/views/image/ImageResizeMethod;->AUTO:Lcom/facebook/react/views/image/ImageResizeMethod;

    aput-object v4, v0, v1

    sget-object v1, Lcom/facebook/react/views/image/ImageResizeMethod;->RESIZE:Lcom/facebook/react/views/image/ImageResizeMethod;

    aput-object v1, v0, v2

    sget-object v1, Lcom/facebook/react/views/image/ImageResizeMethod;->SCALE:Lcom/facebook/react/views/image/ImageResizeMethod;

    aput-object v1, v0, v3

    sput-object v0, Lcom/facebook/react/views/image/ImageResizeMethod;->$VALUES:[Lcom/facebook/react/views/image/ImageResizeMethod;

    return-void
.end method

.method private constructor <init>(Ljava/lang/String;I)V
    .locals 0
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "()V"
        }
    .end annotation

    .line 10
    invoke-direct {p0, p1, p2}, Ljava/lang/Enum;-><init>(Ljava/lang/String;I)V

    return-void
.end method

.method public static valueOf(Ljava/lang/String;)Lcom/facebook/react/views/image/ImageResizeMethod;
    .locals 1

    .line 10
    const-class v0, Lcom/facebook/react/views/image/ImageResizeMethod;

    invoke-static {v0, p0}, Ljava/lang/Enum;->valueOf(Ljava/lang/Class;Ljava/lang/String;)Ljava/lang/Enum;

    move-result-object p0

    check-cast p0, Lcom/facebook/react/views/image/ImageResizeMethod;

    return-object p0
.end method

.method public static values()[Lcom/facebook/react/views/image/ImageResizeMethod;
    .locals 1

    .line 10
    sget-object v0, Lcom/facebook/react/views/image/ImageResizeMethod;->$VALUES:[Lcom/facebook/react/views/image/ImageResizeMethod;

    invoke-virtual {v0}, [Lcom/facebook/react/views/image/ImageResizeMethod;->clone()Ljava/lang/Object;

    move-result-object v0

    check-cast v0, [Lcom/facebook/react/views/image/ImageResizeMethod;

    return-object v0
.end method
