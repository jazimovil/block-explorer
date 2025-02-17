package com.xsn.explorer.data.anorm.parsers

import anorm.SqlParser._
import com.xsn.explorer.models.values._

object CommonParsers {

  // TODO: replace the parseBlockhash method with this one after all fields blockhash fields are migrated to bytea
  def parseBlockhashBytes(field: String) =
    byteArray(field)
      .map(Blockhash.fromBytesBE)
      .map { _.getOrElse(throw new RuntimeException(s"corrupted $field")) }

  def parseBlockhash(field: String = "blockhash") =
    str(field)
      .map(Blockhash.from)
      .map { _.getOrElse(throw new RuntimeException(s"corrupted $field")) }

  def parseAddress(field: String = "address") =
    str(field)
      .map { string =>
        Address.from(string) match {
          case None => throw new RuntimeException(s"Corrupted $field: $string")
          case Some(address) => address
        }
      }

  def parseAddresses =
    array[String]("addresses")
      .map { array =>
        array.map { string =>
          Address.from(string) match {
            case None => throw new RuntimeException(s"Corrupted address: $string")
            case Some(address) => address
          }
        }.toList
      }

  def parseTransactionId(field: String = "txid") =
    str(field)
      .map(TransactionId.from)
      .map { _.getOrElse(throw new RuntimeException(s"corrupted $field")) }

  def parseHexString(field: String) = byteArray(field).map(HexString.fromBytesBE)

  val parseTime = long("time")
  val parseSize = int("size").map(Size.apply)
  val parseIndex = int("index")
}
