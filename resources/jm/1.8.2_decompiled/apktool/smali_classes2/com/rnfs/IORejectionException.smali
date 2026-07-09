.class Lcom/rnfs/IORejectionException;
.super Ljava/lang/Exception;
.source "IORejectionException.java"


# instance fields
.field private code:Ljava/lang/String;


# direct methods
.method public constructor <init>(Ljava/lang/String;Ljava/lang/String;)V
    .locals 0

    .line 7
    invoke-direct {p0, p2}, Ljava/lang/Exception;-><init>(Ljava/lang/String;)V

    .line 8
    iput-object p1, p0, Lcom/rnfs/IORejectionException;->code:Ljava/lang/String;

    return-void
.end method


# virtual methods
.method public getCode()Ljava/lang/String;
    .locals 1

    .line 12
    iget-object v0, p0, Lcom/rnfs/IORejectionException;->code:Ljava/lang/String;

    return-object v0
.end method
