package com.xsn.explorer.services

import com.alexitc.playsonify.core.FutureOr.Implicits.{FutureOps, OrOps}
import com.alexitc.playsonify.core.{ApplicationResult, FutureApplicationResult}
import com.alexitc.playsonify.models.ApplicationError
import com.xsn.explorer.config.{ExplorerConfig, RPCConfig}
import com.xsn.explorer.errors._
import com.xsn.explorer.executors.ExternalServiceExecutionContext
import com.xsn.explorer.models._
import com.xsn.explorer.models.values._
import javax.inject.Inject
import org.scalactic.{Bad, Good}
import org.slf4j.LoggerFactory
import play.api.libs.json._
import play.api.libs.ws.{WSAuthScheme, WSClient, WSResponse}

import scala.util.Try

trait XSNService {

  def getTransaction(txid: TransactionId): FutureApplicationResult[rpc.Transaction[rpc.TransactionVIN]]

  def getRawTransaction(txid: TransactionId): FutureApplicationResult[JsValue]

  def getBlock(blockhash: Blockhash): FutureApplicationResult[rpc.Block.Canonical]

  def getFullBlock(blockhash: Blockhash): FutureApplicationResult[rpc.Block.HasTransactions[rpc.TransactionVIN]]

  def getRawBlock(blockhash: Blockhash): FutureApplicationResult[JsValue]

  def getBlockhash(height: Height): FutureApplicationResult[Blockhash]

  def getLatestBlock(): FutureApplicationResult[rpc.Block.Canonical]

  def getServerStatistics(): FutureApplicationResult[rpc.ServerStatistics]

  def getMasternodeCount(): FutureApplicationResult[Int]

  def getDifficulty(): FutureApplicationResult[BigDecimal]

  def getMasternodes(): FutureApplicationResult[List[rpc.Masternode]]

  def getMasternode(ipAddress: IPAddress): FutureApplicationResult[rpc.Masternode]

  def getUnspentOutputs(address: Address): FutureApplicationResult[JsValue]

  def sendRawTransaction(hex: HexString): FutureApplicationResult[String]

  def isTPoSContract(txid: TransactionId): FutureApplicationResult[Boolean]

  def estimateSmartFee(confirmationsTarget: Int): FutureApplicationResult[JsValue]

  def cleanGenesisBlock(block: rpc.Block.Canonical): rpc.Block.Canonical = {
    Option(block)
      .filter(_.hash == genesisBlockhash)
      .map(_.copy(transactions = List.empty))
      .getOrElse(block)
  }

  def genesisBlockhash: Blockhash

}

class XSNServiceRPCImpl @Inject()(ws: WSClient, rpcConfig: RPCConfig, explorerConfig: ExplorerConfig)(
    implicit ec: ExternalServiceExecutionContext
) extends XSNService {

  private val logger = LoggerFactory.getLogger(this.getClass)

  private val server = ws
    .url(rpcConfig.host.string)
    .withAuth(rpcConfig.username.string, rpcConfig.password.string, WSAuthScheme.BASIC)
    .withHttpHeaders("Content-Type" -> "text/plain")

  override def getTransaction(txid: TransactionId): FutureApplicationResult[rpc.Transaction[rpc.TransactionVIN]] = {
    val errorCodeMapper = Map(-5 -> TransactionError.NotFound(txid))

    server
      .post(s"""{ "jsonrpc": "1.0", "method": "getrawtransaction", "params": ["${txid.string}", 1] }""")
      .map { response =>
        val maybe = getResult[rpc.Transaction[rpc.TransactionVIN]](response, errorCodeMapper)
        maybe.getOrElse {
          logger.warn(
            s"Unexpected response from XSN Server, txid = ${txid.string}, status = ${response.status}, response = ${response.body}"
          )

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def getRawTransaction(txid: TransactionId): FutureApplicationResult[JsValue] = {
    val errorCodeMapper = Map(-5 -> TransactionError.NotFound(txid))

    server
      .post(s"""{ "jsonrpc": "1.0", "method": "getrawtransaction", "params": ["${txid.string}", 1] }""")
      .map { response =>
        val maybe = getResult[JsValue](response, errorCodeMapper)
        maybe.getOrElse {
          logger.warn(
            s"Unexpected response from XSN Server, txid = ${txid.string}, status = ${response.status}, response = ${response.body}"
          )

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def getBlock(blockhash: Blockhash): FutureApplicationResult[rpc.Block.Canonical] = {
    val errorCodeMapper = Map(-5 -> BlockNotFoundError)
    val body = s"""{ "jsonrpc": "1.0", "method": "getblock", "params": ["${blockhash.string}"] }"""

    server
      .post(body)
      .map { response =>
        val maybe = getResult[rpc.Block.Canonical](response, errorCodeMapper)
        maybe
          .map {
            case Good(block) => Good(cleanGenesisBlock(block))
            case x => x
          }
          .getOrElse {
            logger.warn(
              s"Unexpected response from XSN Server, blockhash = ${blockhash.string}, status = ${response.status}, response = ${response.body}"
            )

            Bad(XSNUnexpectedResponseError).accumulating
          }
      }
  }

  override def getFullBlock(
      blockhash: Blockhash
  ): FutureApplicationResult[rpc.Block.HasTransactions[rpc.TransactionVIN]] = {
    val errorCodeMapper = Map(-5 -> BlockNotFoundError)
    val body = s"""{ "jsonrpc": "1.0", "method": "getblock", "params": ["${blockhash.string}", 2] }"""

    server
      .post(body)
      .map { response =>
        val maybe = getResult[rpc.Block.HasTransactions[rpc.TransactionVIN]](response, errorCodeMapper)
        maybe
          .map {
            case Good(block) => Good(block)
            case x => x
          }
          .getOrElse {
            logger.warn(
              s"Unexpected response from XSN Server, blockhash = ${blockhash.string}, status = ${response.status}, response = ${response.body}"
            )

            Bad(XSNUnexpectedResponseError).accumulating
          }
      }
  }

  override def getRawBlock(blockhash: Blockhash): FutureApplicationResult[JsValue] = {
    val errorCodeMapper = Map(-5 -> BlockNotFoundError)
    val body = s"""{ "jsonrpc": "1.0", "method": "getblock", "params": ["${blockhash.string}"] }"""

    server
      .post(body)
      .map { response =>
        val maybe = getResult[JsValue](response, errorCodeMapper)
        maybe.getOrElse {
          logger.warn(
            s"Unexpected response from XSN Server, blockhash = ${blockhash.string}, status = ${response.status}, response = ${response.body}"
          )

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def getBlockhash(height: Height): FutureApplicationResult[Blockhash] = {
    val errorCodeMapper = Map(-8 -> BlockNotFoundError)
    val body = s"""{ "jsonrpc": "1.0", "method": "getblockhash", "params": [${height.int}] }"""

    server
      .post(body)
      .map { response =>
        val maybe = getResult[Blockhash](response, errorCodeMapper)
        maybe.getOrElse {
          logger.warn(
            s"Unexpected response from XSN Server, blockhash = ${height.int}, status = ${response.status}, response = ${response.body}"
          )

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def getLatestBlock(): FutureApplicationResult[rpc.Block.Canonical] = {
    val body = s"""
                  |{
                  |  "jsonrpc": "1.0",
                  |  "method": "getbestblockhash",
                  |  "params": []
                  |}
                  |""".stripMargin

    server
      .post(body)
      .flatMap { response =>
        val result = for {
          blockhash <- getResult[Blockhash](response)
            .orElse {
              logger.warn(
                s"Unexpected response from XSN Server, status = ${response.status}, response = ${response.body}"
              )
              None
            }
            .getOrElse(Bad(XSNUnexpectedResponseError).accumulating)
            .toFutureOr

          block <- getBlock(blockhash).map {
            case Good(block) => Good(cleanGenesisBlock(block))
            case x => x
          }.toFutureOr
        } yield block

        result.toFuture
      }
  }

  override def getServerStatistics(): FutureApplicationResult[rpc.ServerStatistics] = {
    val body = s"""
                  |{
                  |  "jsonrpc": "1.0",
                  |  "method": "gettxoutsetinfo",
                  |  "params": []
                  |}
                  |""".stripMargin

    server
      .post(body)
      .map { response =>
        val maybe = getResult[rpc.ServerStatistics](response)
        maybe.getOrElse {
          logger.warn(s"Unexpected response from XSN Server, status = ${response.status}, response = ${response.body}")

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def getMasternodeCount(): FutureApplicationResult[Int] = {
    val body = s"""
                  |{
                  |  "jsonrpc": "1.0",
                  |  "method": "masternode",
                  |  "params": ["count"]
                  |}
                  |""".stripMargin

    server
      .post(body)
      .map { response =>
        val maybe = getResult[Int](response)
        maybe.getOrElse {
          logger.warn(s"Unexpected response from XSN Server, status = ${response.status}, response = ${response.body}")

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def getDifficulty(): FutureApplicationResult[BigDecimal] = {
    val body = s"""
                  |{
                  |  "jsonrpc": "1.0",
                  |  "method": "getdifficulty",
                  |  "params": []
                  |}
                  |""".stripMargin

    server
      .post(body)
      .map { response =>
        val maybe = getResult[BigDecimal](response)
        maybe.getOrElse {
          logger.warn(s"Unexpected response from XSN Server, status = ${response.status}, response = ${response.body}")

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def getMasternodes(): FutureApplicationResult[List[rpc.Masternode]] = {
    val body = s"""
                  |{
                  |  "jsonrpc": "1.0",
                  |  "method": "masternode",
                  |  "params": ["list", "full"]
                  |}
                  |""".stripMargin

    server
      .post(body)
      .map { response =>
        val maybe = getResult[Map[String, String]](response)
          .map {
            case Good(map) => Good(rpc.Masternode.fromMap(map))
            case Bad(errors) => Bad(errors)
          }

        maybe.getOrElse {
          logger.warn(s"Unexpected response from XSN Server, status = ${response.status}, response = ${response.body}")

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def getMasternode(ipAddress: IPAddress): FutureApplicationResult[rpc.Masternode] = {
    val body = s"""
                  |{
                  |  "jsonrpc": "1.0",
                  |  "method": "masternode",
                  |  "params": ["list", "full", "${ipAddress.string}"]
                  |}
                  |""".stripMargin

    server
      .post(body)
      .map { response =>
        val maybe = getResult[Map[String, String]](response)
          .map {
            case Good(map) =>
              rpc.Masternode
                .fromMap(map)
                .headOption
                .map(Good(_))
                .getOrElse(Bad(MasternodeNotFoundError).accumulating)

            case Bad(errors) => Bad(errors)
          }

        maybe.getOrElse {
          logger.warn(s"Unexpected response from XSN Server, status = ${response.status}, response = ${response.body}")

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def getUnspentOutputs(address: Address): FutureApplicationResult[JsValue] = {
    val body = s"""
                  |{
                  |  "jsonrpc": "1.0",
                  |  "method": "getaddressutxos",
                  |  "params": [
                  |    { "addresses": ["${address.string}"] }
                  |  ]
                  |}
                  |""".stripMargin

    server
      .post(body)
      .map { response =>
        val maybe = getResult[JsValue](response)
        maybe.getOrElse {
          logger.warn(s"Unexpected response from XSN Server, status = ${response.status}, response = ${response.body}")

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def sendRawTransaction(hex: HexString): FutureApplicationResult[String] = {
    val errorCodeMapper = Map(
      -26 -> TransactionError.InvalidRawTransaction,
      -22 -> TransactionError.InvalidRawTransaction,
      -27 -> TransactionError.RawTransactionAlreadyExists
    )

    val body = s"""
                  |{
                  |  "jsonrpc": "1.0",
                  |  "method": "sendrawtransaction",
                  |  "params": ["${hex.string}"]
                  |}
                  |""".stripMargin

    server
      .post(body)
      .map { response =>
        val maybe = getResult[String](response, errorCodeMapper).map { _.map(_.toString()) }

        maybe.getOrElse {
          logger.warn(s"Unexpected response from XSN Server, status = ${response.status}, response = ${response.body}")

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def isTPoSContract(txid: TransactionId): FutureApplicationResult[Boolean] = {
    val innerBody = Json.obj("txid" -> txid.string, "check_spent" -> 0)
    val body = Json.obj(
      "jsonrpc" -> "1.0",
      "method" -> "tposcontract",
      "params" -> List(
        JsString("validate"),
        JsString(innerBody.toString())
      )
    )

    server
      .post(body)
      .map { response =>
        val maybe = getResult[String](response)
          .map { _.map(_ == "Contract is valid") }

        maybe.getOrElse {
          logger.warn(s"Unexpected response from XSN Server, status = ${response.status}, response = ${response.body}")

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  override def estimateSmartFee(confirmationsTarget: Int): FutureApplicationResult[JsValue] = {
    val body = s"""
                  |{
                  |  "jsonrpc": "1.0",
                  |  "method": "estimatesmartfee",
                  |  "params": [$confirmationsTarget]
                  |}
                  |""".stripMargin

    server
      .post(body)
      .map { response =>
        val maybe = getResult[JsValue](response)

        maybe.getOrElse {
          logger.warn(s"Unexpected response from XSN Server, status = ${response.status}, response = ${response.body}")

          Bad(XSNUnexpectedResponseError).accumulating
        }
      }
  }

  private def mapError(json: JsValue, errorCodeMapper: Map[Int, ApplicationError]): Option[ApplicationError] = {
    val jsonErrorMaybe = (json \ "error")
      .asOpt[JsValue]
      .filter(_ != JsNull)

    val errorMaybe = jsonErrorMaybe
      .flatMap { jsonError =>
        // from error code if possible
        (jsonError \ "code")
          .asOpt[Int]
          .flatMap(errorCodeMapper.get)
          .orElse {
            // from message
            (jsonError \ "message")
              .asOpt[String]
              .filter(_.nonEmpty)
              .map(XSNMessageError.apply)
          }
      }

    errorMaybe
      .collect {
        case XSNMessageError("Work queue depth exceeded") => XSNWorkQueueDepthExceeded
      }
      .orElse(errorMaybe)
  }

  private def getResult[A](response: WSResponse, errorCodeMapper: Map[Int, ApplicationError] = Map.empty)(
      implicit reads: Reads[A]
  ): Option[ApplicationResult[A]] = {

    val maybe = Option(response)
      .filter(_.status == 200)
      .flatMap { r =>
        Try(r.json).toOption
      }
      .flatMap { json =>
        if (logger.isDebugEnabled) {
          val x = (json \ "result").validate[A]
          x.asEither.left.foreach { errors =>
            val msg = errors
              .map { case (path, error) => path.toJsonString -> error.toString() }
              .mkString(", ")
            logger.debug(s"Failed to decode result, errors = ${msg}")
          }
        }
        (json \ "result")
          .asOpt[A]
          .map { Good(_) }
          .orElse {
            mapError(json, errorCodeMapper)
              .map(Bad.apply)
              .map(_.accumulating)
          }
      }

    maybe
      .orElse {
        // if there is no result nor error, it is probably that the server returned non 200 status
        Try(response.json).toOption
          .flatMap { json =>
            mapError(json, errorCodeMapper)
          }
          .map { e =>
            Bad(e).accumulating
          }
      }
      .orElse {
        // if still there is no error, the response might not be a json
        Try(response.body).collect {
          case "Work queue depth exceeded" => Bad(XSNWorkQueueDepthExceeded).accumulating
        }.toOption
      }
  }

  override val genesisBlockhash: Blockhash = explorerConfig.genesisBlock

}
