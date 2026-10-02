# 改善 계획 검토 근거 — 2026-09-25

계획·분석 스크립트 원문과 오프라인 검사. 운영 코드 수정·실사이트 실행 없음.

## 직접 재검사 출력
```json
{
  "hashes": {
    "IMPROVEMENT_PLAN_20260925.md": "b7e8e6c038f166eb715351bd056f805191dc8b432cde2ebd272549fad8d6a87d",
    "pilot.py": "b814ac9e616bc65a29b1be8e3169d8d2151d53d4df13aca225efd65bae0b98ca",
    "run_live.py": "7f3f470b1771b3d7a109e0074e3ce80e9d9733295f858e11200e50e1fbe18d0a",
    "research/oracle_deaths_20260925.py": "81027a6bfa4f3e74cfd330f6e8aeb8a0fb7b60fc48d4c75bc3deed5d8a308551",
    "research/false_alarm_20260925.py": "7ee48add01aca74f801aad21e2951f3c862cb1893b8eb2425b39859ad7e995f4"
  },
  "no_way_rows": [
    {
      "game": "0260925_171635",
      "seconds": 96.1,
      "moments": [
        {
          "before": 2.0,
          "oracle_safe": 30,
          "best_gap": 74.0,
          "chosen_realized": 22.8,
          "planner_safe": 4,
          "planner_hard": 10.4,
          "mode": "feed"
        },
        {
          "before": 1.2,
          "oracle_safe": 2,
          "best_gap": 10.9,
          "chosen_realized": 11.3,
          "planner_safe": 10,
          "planner_hard": 10.8,
          "mode": "evade"
        }
      ],
      "category": "no_way"
    },
    {
      "game": "0260925_184019",
      "seconds": 356.6,
      "moments": [
        {
          "before": 2.0,
          "oracle_safe": 17,
          "best_gap": 53.1,
          "chosen_realized": 27.0,
          "planner_safe": 3,
          "planner_hard": 22.0,
          "mode": "evade"
        },
        {
          "before": 1.2,
          "oracle_safe": 0,
          "best_gap": -0.7,
          "chosen_realized": -0.7,
          "planner_safe": 0,
          "planner_hard": -2.8,
          "mode": "emergency"
        }
      ],
      "category": "no_way"
    },
    {
      "game": "0260925_184659",
      "seconds": 44.2,
      "moments": [
        {
          "before": 2.0,
          "oracle_safe": 6,
          "best_gap": 30.7,
          "chosen_realized": 12.6,
          "planner_safe": 2,
          "planner_hard": 9.3,
          "mode": "evade"
        },
        {
          "before": 1.2,
          "oracle_safe": 0,
          "best_gap": -16.1,
          "chosen_realized": -48.0,
          "planner_safe": 0,
          "planner_hard": -17.1,
          "mode": "emergency"
        }
      ],
      "category": "no_way"
    },
    {
      "game": "0260925_185508",
      "seconds": 192.7,
      "moments": [
        {
          "before": 2.0,
          "oracle_safe": 4,
          "best_gap": 25.3,
          "chosen_realized": -35.4,
          "planner_safe": 3,
          "planner_hard": 12.3,
          "mode": "unwrap"
        },
        {
          "before": 1.2,
          "oracle_safe": 0,
          "best_gap": -18.9,
          "chosen_realized": -44.8,
          "planner_safe": 0,
          "planner_hard": -41.1,
          "mode": "emergency"
        }
      ],
      "category": "no_way"
    },
    {
      "game": "0260925_185849",
      "seconds": 71.3,
      "moments": [
        {
          "before": 2.0,
          "oracle_safe": 9,
          "best_gap": 28.1,
          "chosen_realized": 12.1,
          "planner_safe": 4,
          "planner_hard": 14.3,
          "mode": "evade"
        },
        {
          "before": 1.2,
          "oracle_safe": 4,
          "best_gap": 27.4,
          "chosen_realized": 2.0,
          "planner_safe": 0,
          "planner_hard": -27.2,
          "mode": "emergency"
        }
      ],
      "category": "no_way"
    },
    {
      "game": "0260925_192050",
      "seconds": 67.3,
      "moments": [
        {
          "before": 2.0,
          "oracle_safe": 6,
          "best_gap": 48.0,
          "chosen_realized": -57.0,
          "planner_safe": 0,
          "planner_hard": 17.5,
          "mode": "coil"
        },
        {
          "before": 1.2,
          "oracle_safe": 4,
          "best_gap": 22.3,
          "chosen_realized": 12.1,
          "planner_safe": 0,
          "planner_hard": -52.4,
          "mode": "emergency"
        }
      ],
      "category": "no_way"
    }
  ],
  "coverage": [
    {
      "game": "live_20260925_170651",
      "target_end_minus_last_observation_s": 0.025604399986320914,
      "nearest_observation_errors": [
        0.005760820016746493,
        0.0187587699876417,
        0.018113279986437192,
        0.014039230016066995,
        0.031962200003931684,
        0.04803779999610924,
        2.752002677652854e-05,
        0.0006474500254398663,
        0.014128740004935025,
        0.02155426998507437,
        0.028894160005734193,
        0.026304690013660093,
        0.001079779983285789,
        0.022305639989212978,
        0.025604399986320914
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 402.63645438000094
    },
    {
      "game": "live_20260925_171431",
      "target_end_minus_last_observation_s": 0.020156700006921824,
      "nearest_observation_errors": [
        0.025868349986851058,
        0.0004299100220634955,
        0.009030750001542742,
        0.00433129000128929,
        0.045046219974750557,
        0.027219029997937128,
        0.006870039998318589,
        0.02003185001434815,
        0.03216491997707749,
        0.028984779975147035,
        0.002364229997624534,
        0.021026039998972124,
        0.018530679991229704,
        0.006241819991259945,
        0.020156700006921824
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 104.04122976001236
    },
    {
      "game": "live_20260925_171635",
      "target_end_minus_last_observation_s": -0.01576112997717871,
      "nearest_observation_errors": [
        0.015227469981184072,
        0.011021380018206628,
        0.025726349985930597,
        0.006700629986596596,
        0.01034544999711784,
        0.031166040007960305,
        0.009709269999291337,
        0.010944190013688626,
        0.028058939992916976,
        0.006401420000472058,
        0.003005440022093353,
        0.01970745001104035,
        0.003515350000228068,
        0.019442470021317604,
        0.01576112997717871
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 0,
      "last_observed_time": 95.8408391699777
    },
    {
      "game": "live_20260925_171833",
      "target_end_minus_last_observation_s": 0.02630235000397363,
      "nearest_observation_errors": [
        0.023951169992798782,
        0.012964119985696243,
        0.009115350005444611,
        0.01150932998979215,
        0.020484230009600424,
        0.008969520004470155,
        0.01824423999408964,
        0.015224140007049414,
        0.004565340002301355,
        0.016547499998708304,
        0.01136266000219166,
        0.019900470003491932,
        0.011588720014557907,
        0.0038646499987180505,
        0.02630235000397363
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 96.24102416998358
    },
    {
      "game": "live_20260925_172034",
      "target_end_minus_last_observation_s": 0.007478759990775075,
      "nearest_observation_errors": [
        0.009392569989429944,
        0.004616840018428547,
        0.030542340003890445,
        0.04945765999610785,
        0.004198449989786468,
        0.06866367002250229,
        0.011336329977496007,
        0.0778445900208311,
        0.002155409979167189,
        0.05287185999914357,
        0.027128140000854728,
        0.09105141000240735,
        0.011051410002394846,
        0.06894858999760345,
        0.007478759990775075
      ],
      "skipped_steps": 4,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 124.54140384000493
    },
    {
      "game": "live_20260925_172303",
      "target_end_minus_last_observation_s": 0.019204680010432185,
      "nearest_observation_errors": [
        0.009652510010624837,
        0.007024120012061985,
        0.022830270007261788,
        0.004342270003405702,
        0.021844750014139436,
        0.022816860011090512,
        0.003714860011825749,
        0.023251960010952644,
        0.03176837999606619,
        0.00479629000182058,
        0.004905879987632034,
        0.02391711000470309,
        0.010402419990867884,
        0.023176839987286257,
        0.019204680010432185
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 138.1264792199945
    },
    {
      "game": "live_20260925_172548",
      "target_end_minus_last_observation_s": 0.015106800000637577,
      "nearest_observation_errors": [
        0.013183210003205659,
        0.005532319981114142,
        0.002149890011651223,
        0.011156179993406568,
        0.015482560009672852,
        0.005884140020953055,
        0.02651707999990549,
        0.030296080004177384,
        0.002280150015167237,
        0.012896019982861162,
        0.008363000005488175,
        0.022409250007456194,
        0.014594810017172222,
        0.012512649996210712,
        0.015106800000637577
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 329.1636704400007
    },
    {
      "game": "live_20260925_173206",
      "target_end_minus_last_observation_s": -0.0191481000045286,
      "nearest_observation_errors": [
        0.010104580012850306,
        0.017091110002951382,
        0.046061940016230096,
        0.026482900000416976,
        0.013536320003908031,
        0.002643059986880303,
        0.006107509982541615,
        0.01951488999533524,
        0.026465759989804383,
        0.032212990004339304,
        0.016158349991314935,
        0.002362619990023518,
        0.005680850000359783,
        0.02209998999489926,
        0.0191481000045286
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 0,
      "last_observed_time": 106.81429850999848
    },
    {
      "game": "live_20260925_183803",
      "target_end_minus_last_observation_s": 0.004663896999954176,
      "nearest_observation_errors": [
        0.02228780099996186,
        0.005212281000037677,
        0.024937412999964437,
        0.015903712000003623,
        0.017314539999993883,
        0.002739970000011027,
        0.008991262999980876,
        0.023415938999974628,
        0.0337676750000071,
        0.03092218300004035,
        0.0052295450000166,
        0.015435880000005398,
        0.025800025000002336,
        0.021697034000002446,
        0.004663896999954176
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 18.23377086200003
    },
    {
      "game": "live_20260925_183834",
      "target_end_minus_last_observation_s": -0.01697833000001836,
      "nearest_observation_errors": [
        0.015371443999995904,
        0.010612836000031933,
        0.02342431500001041,
        0.03717452800002974,
        0.015988451000033876,
        0.013027957000002033,
        0.03486494199995249,
        0.024428220000046963,
        0.0030723810000097274,
        0.010026428999982073,
        0.020913407000019646,
        0.0008809250000254565,
        0.020398191000005284,
        0.013524125999996528,
        0.01697833000001836
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 0,
      "last_observed_time": 28.684441323999977
    },
    {
      "game": "live_20260925_183915",
      "target_end_minus_last_observation_s": 0.031186860000005368,
      "nearest_observation_errors": [
        0.02048970300002395,
        0.033650112000003674,
        0.03195082200004862,
        0.020989036999999655,
        0.03252726300004127,
        0.026413419000029137,
        0.014876349000019218,
        0.00900258599999404,
        0.00927956600000357,
        0.023652510000019333,
        0.025953476999966085,
        0.015158647999989228,
        0.012052529999969863,
        0.0048492490000100474,
        0.031186860000005368
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 47.168457241
    },
    {
      "game": "live_20260925_184019",
      "target_end_minus_last_observation_s": 0.0021103930000094806,
      "nearest_observation_errors": [
        0.009756583000068986,
        0.0035452640000244173,
        0.024142414000039025,
        0.003978211000060128,
        0.027484808999929555,
        0.005364453999959551,
        0.04075739699993619,
        0.013277718000040295,
        0.0032510789999378176,
        0.028253415999927256,
        0.014713325999991866,
        0.009458806999930403,
        0.015190474000007725,
        0.019057122999925014,
        0.0021103930000094806
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 356.226921952
    },
    {
      "game": "live_20260925_184659",
      "target_end_minus_last_observation_s": -0.014949799000007147,
      "nearest_observation_errors": [
        0.02306336199997361,
        0.004895458999925495,
        0.005945293000074514,
        0.025123371000013606,
        0.0239747039999898,
        0.00216035999996933,
        0.0037371870000129093,
        0.003150553999930139,
        0.010478902000016888,
        0.025197604000069873,
        0.023300345999921035,
        0.0017138789999435744,
        0.015375995000034948,
        0.029547920000020156,
        0.014949799000007147
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 0,
      "last_observed_time": 43.87255229200002
    },
    {
      "game": "live_20260925_184759",
      "target_end_minus_last_observation_s": 0.011987679999890588,
      "nearest_observation_errors": [
        0.021547361000017418,
        0.007970084000049837,
        0.011017261999995753,
        0.0004469350000704253,
        0.021772652000066728,
        0.0028496749999078475,
        0.01684087400002454,
        0.01911462400005348,
        0.009330577999918432,
        0.021112950999906843,
        0.0027210679999143395,
        0.01140912000008143,
        0.02093525899996962,
        0.014366386999995484,
        0.011987679999890588
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 217.07999085500012
    },
    {
      "game": "live_20260925_185208",
      "target_end_minus_last_observation_s": 0.014867956000159666,
      "nearest_observation_errors": [
        0.012370996000157675,
        0.019385864000156516,
        0.008154952000040794,
        0.02066532999987203,
        0.008834149000136904,
        0.02175421400008304,
        0.005863090000104876,
        0.009280603999854975,
        0.020038894000009577,
        0.009467735000100674,
        0.0037543079998840767,
        0.016685867000006738,
        0.005092735000033599,
        0.010717090999946777,
        0.014867956000159666
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 155.4458355019999
    },
    {
      "game": "live_20260925_185508",
      "target_end_minus_last_observation_s": -0.02990895500016677,
      "nearest_observation_errors": [
        0.01975757999989014,
        0.029126019999836217,
        0.031415867999839975,
        0.014837039000155983,
        0.0011900799999295941,
        0.020150638999865578,
        0.015820925000014086,
        0.0026047729999163494,
        0.022868112999987034,
        0.028298324000104458,
        0.047512737000147354,
        0.03248726299986515,
        0.02023200299984751,
        0.032542591999913384,
        0.02990895500016677
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 0,
      "last_observed_time": 192.24953491400015
    },
    {
      "game": "live_20260925_185849",
      "target_end_minus_last_observation_s": 0.006603226999871481,
      "nearest_observation_errors": [
        0.0064982830000843705,
        0.014050175999869907,
        0.029217683000084094,
        0.009537008999984664,
        0.0031443629999614586,
        0.02813450799997952,
        0.009417074000054981,
        0.011739211999966415,
        0.024239959999960092,
        0.008171967999984986,
        0.04064576999996916,
        0.02545190799996533,
        0.008081900000021847,
        0.024710654000159593,
        0.006603226999871481
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 70.97688230300014
    },
    {
      "game": "live_20260925_190018",
      "target_end_minus_last_observation_s": 0.017125922000047922,
      "nearest_observation_errors": [
        0.02794332999988569,
        0.045792404000025044,
        0.026453913000068496,
        0.008797462000018186,
        0.04588632199997278,
        0.034113678000011305,
        0.0020984370001428942,
        0.08209843700012698,
        0.013065257999897995,
        0.06693474200011451,
        0.1469347420000986,
        0.10285489299988626,
        0.022854892999902177,
        0.05714510700011033,
        0.017125922000047922
      ],
      "skipped_steps": 4,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 201.68573145799996
    },
    {
      "game": "live_20260925_190409",
      "target_end_minus_last_observation_s": -0.029433125000011273,
      "nearest_observation_errors": [
        0.0012779099999278287,
        0.03398402499996678,
        0.03563179999992627,
        0.010739368999956866,
        0.019675378000009403,
        0.03409858499983187,
        0.04590141500017353,
        0.003251373000139779,
        0.0003540769999119675,
        0.07128475500003617,
        0.00871524499996923,
        0.031099557000025868,
        0.002136921000136738,
        0.08213692100013503,
        0.029433125000011273
      ],
      "skipped_steps": 2,
      "targets_beyond_last_observation": 0,
      "last_observed_time": 52.77902793800013
    },
    {
      "game": "live_20260925_190520",
      "target_end_minus_last_observation_s": -0.016889050000202133,
      "nearest_observation_errors": [
        0.02170553799993513,
        0.016299343000071076,
        0.021614754000211178,
        0.05533189099998026,
        0.006938438999782193,
        0.04983707100018364,
        0.012952565999910348,
        0.005695600999956696,
        0.01644583699976465,
        0.016809029000057762,
        0.02431287000001703,
        0.009971915999869907,
        0.014266764999831594,
        0.00632761000008486,
        0.016889050000202133
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 0,
      "last_observed_time": 265.74531630800016
    },
    {
      "game": "live_20260925_191022",
      "target_end_minus_last_observation_s": 0.006782613999973819,
      "nearest_observation_errors": [
        0.00571864299996605,
        0.010629355999924428,
        0.016001981999806958,
        0.009179060000121808,
        0.0012499359999083026,
        0.01027821000025142,
        0.013487085000235766,
        0.002262877000134722,
        0.005355509000082748,
        0.011653012000181207,
        0.01814835400011816,
        0.011388312999827122,
        0.010351698999727432,
        0.00011121299996830203,
        0.006782613999973819
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 282.2845204700002
    },
    {
      "game": "live_20260925_191540",
      "target_end_minus_last_observation_s": 0.009783796000363054,
      "nearest_observation_errors": [
        0.02482973300001845,
        0.021579736999996157,
        0.002468206999992617,
        0.01664543200041635,
        0.03899867000009749,
        0.018585318999640776,
        0.0008023959999832186,
        0.0214126370002532,
        0.01805665299960424,
        0.007836294000128419,
        0.024157955999839942,
        0.0030575230002511944,
        0.02493621500028098,
        0.010434030999817878,
        0.009783796000363054
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 1,
      "last_observed_time": 145.4019096549996
    },
    {
      "game": "live_20260925_191831",
      "target_end_minus_last_observation_s": -0.013907668000044282,
      "nearest_observation_errors": [
        0.003496552999806113,
        0.007816158999816025,
        0.0243658760002603,
        0.012198796999939532,
        0.00710627299994826,
        0.008677201999930162,
        0.006484824999859029,
        0.01677654299997755,
        0.016807404999980236,
        0.0028789879999777668,
        0.006420547999937298,
        0.005478559999986032,
        0.015923604999855456,
        0.006332927000244126,
        0.013907668000044282
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 0,
      "last_observed_time": 117.4849794290003
    },
    {
      "game": "live_20260925_192050",
      "target_end_minus_last_observation_s": -0.004645638999861035,
      "nearest_observation_errors": [
        0.009382710999872756,
        0.009966485999797214,
        0.005179749999811634,
        0.0019252519998076423,
        0.0114351690002934,
        0.00468188300008876,
        0.01752447299980986,
        0.014575427999588442,
        0.018357416000270632,
        0.004552565000082609,
        0.01698227600024893,
        0.005586375999925508,
        0.004686392000209594,
        0.014606430000299042,
        0.004645638999861035
      ],
      "skipped_steps": 0,
      "targets_beyond_last_observation": 0,
      "last_observed_time": 67.03053358199986
    }
  ],
  "missing_observation_counterexample": {
    "returned_gap": "inf",
    "caller_counts_safe": true
  },
  "wall_counterexample": {
    "body_gap": 691.1089380465382,
    "actual_wall_gap": -11.0,
    "caller_counts_safe": true
  },
  "summary": {
    "no_way_games": 6,
    "no_way_with_positive_candidates": 3,
    "games_with_skipped_steps": 3,
    "total_skipped_steps": 10,
    "games_with_endpoint_past_last_observation": 15
  }
}
```

## research/oracle_deaths_20260925.py:20-30
```text
20: def realized(pos, t0, times, states, ro):
21:     """Min drawn gap of path points pos (C,N,2) at times t0+times against the bodies observed at those times."""
22:     C = pos.shape[0]; g = np.full(C, np.inf)
23:     for n, dt in enumerate(times):
24:         j = int(np.argmin(abs(times_all - (t0+dt))))
25:         if abs(times_all[j]-(t0+dt)) > .06: continue          # no observation that late (past death): skip
26:         segs = arr(states[j], 'segs', 5)
27:         if not len(segs): continue
28:         d = pilot.seg_dist(pos[:, n], segs)-segs[:, 4][None]-ro
29:         g = np.minimum(g, d.min(1))
30:     return g
```

## research/oracle_deaths_20260925.py:41-67
```text
41:     times_all = np.array([s['t'] for s in states]); T = times_all[-1]
42:     row = dict(game=f[-20:-6], seconds=r['seconds'], moments=[])
43:     for m in MOMENTS:
44:         k = int(np.argmin(abs(times_all-(T-m))))
45:         s = states[k]; p = np.array([s['x'], s['y']]); ro = pilot.R*s['sc']
46:         prev = box[k-1]['cmd'][0] if k else s['ang']; pb = box[k-1]['cmd'][1] if k else False
47:         hd = np.r_[s['ang']+pilot.ANGLES, s['ang']+pilot.ANGLES]
48:         bst = np.r_[np.zeros(len(pilot.ANGLES), bool), np.ones(len(pilot.ANGLES), bool)]
49:         pos, t = pilot.paths(p, s['ang'], s['sp'], s['sc'], prev, hd, bst, pb)
50:         g = realized(pos, s['t'], t, states, ro)
51:         cpos, _ = pilot.paths(p, s['ang'], s['sp'], s['sc'], prev, np.array([box[k]['cmd'][0]]), np.array([box[k]['cmd'][1]]), pb)
52:         gc = realized(cpos, s['t'], t, states, ro)[0]
53:         tr = box[k]['last'].get('trace', {})
54:         row['moments'].append(dict(before=m, oracle_safe=int((g > 0).sum()), best_gap=round(float(g.max()), 1),
55:                                    chosen_realized=round(float(gc), 1), planner_safe=tr.get('n_safe'),
56:                                    planner_hard=tr.get('hard'), mode=tr.get('mode')))
57:     out.append(row)
58: 
59: # Category at T-1.2 s (window ends at death):
60: #  miss        planner judged its chosen path safe (n_safe>0, hard>0) and the oracle still had safe maneuvers
61: #  blind       planner saw no safe path (n_safe 0) while the oracle had >= 5
62: #  no_way      the oracle had < 5 safe maneuvers (position already lost)
63: #  chose_bad   planner had safe paths but picked one it predicted unsafe (should not happen)
64: for row in out:
65:     m = [x for x in row['moments'] if x['before'] == 1.2][0]
66:     row['category'] = ('no_way' if m['oracle_safe'] < 5 else 'blind' if not m['planner_safe'] else
67:                        'miss' if (m['planner_hard'] or 0) > 0 else 'chose_bad')
```

## research/false_alarm_20260925.py:33-62
```text
33:     states = [b['state'] for b in box]; ts = np.array([s['t'] for s in states]); T = ts[-1]
34:     c = pilot.Pilot(); fa = ta = rej = n = rej_in = 0
35:     for k, b in enumerate(box):
36:         s = {kk: (np.asarray(v, float) if kk in ('segs', 'sid', 'heads', 'hid', 'food', 'own') else v) for kk, v in b['state'].items()}
37:         for kk, w in (('segs', 5), ('food', 3), ('heads', 5), ('own', 2)): s[kk] = s[kk].reshape(-1, w)
38:         if k: c.prev, c.prev_boost = box[k-1]['cmd']          # the command actually being driven
39:         if T-s['t'] > 1.2 or T-s['t'] < .15:
40:             c(s); continue
41:         v = locals_of(c, s); n += 1
42:         held = 2*v['C']-1 if v['self'].prev_boost is False and False else None
43:         C = v['C']; hi = (2*C-1) if box[k-1]['cmd'][1] else (C-1)       # held candidate index (same boost)
44:         if v['safe'][hi]: continue
45:         rej += 1
46:         # Compare only inside the observed window (up to death): the planner may have rejected the held path for a
47:         # touch it predicted after the moment we died, which the record cannot confirm or refute.
48:         pos = v['pos'][hi]; ro = pilot.R*s['sc']; g = np.inf; seen = []
49:         for m, dt in enumerate(v['t']):
50:             j = int(np.argmin(abs(ts-(s['t']+dt))))
51:             if abs(ts[j]-(s['t']+dt)) > .06: continue
52:             seen.append(m)
53:             sg = arr(states[j], 'segs', 5)
54:             if len(sg): g = min(g, float((pilot.seg_dist(pos[m][None], sg)[0]-sg[:, 4]-ro).min()))
55:         if not seen: continue
56:         pred = float(v['gap'][hi][seen].min())                       # planner's own predicted gap in that window
57:         if pred >= pilot.HARD_PHYS: continue                          # rejected for a reason outside the window
58:         rej_in += 1
59:         if g > 5: fa += 1
60:         elif g <= 0: ta += 1
61:     rows.append((f[-20:-6], n, rej_in, fa, ta))
62:     for key, val in zip(('ticks', 'rejected', 'false', 'true'), (n, rej_in, fa, ta)): tot[key] += val
```

## pilot.py:395-415
```text
395:         if wrap_esc is None:
396:             self.esc_lock = None
397:         elif self.esc_lock is not None and s['t'] < self.esc_lock[1]:
398:             wrap_esc = self.esc_lock[0]
399:         else:
400:             self.esc_lock = (wrap_esc, s['t']+1.5)
401:         # Coil on our own circle (user): wrapped -> full-rate turn, one direction chosen once (the side with more room).
402:         k90 = int(np.argmin(abs(ANGLES-np.pi/2))); km90 = int(np.argmin(abs(ANGLES+np.pi/2)))
403:         if self.coil_dir == 0 and wrap_cov >= COIL_ON:
404:             # Same direction as a coil that ended < 10 s ago (never switch sides around the same ring), else the roomier side.
405:             if self.last_coil and s['t']-self.last_coil[1] < 10.:
406:                 self.coil_dir = self.last_coil[0]
407:             else:
408:                 self.coil_dir = 1. if clear[k90] >= clear[km90] else -1.
409:             self.coil_low_since = None
410:         elif self.coil_dir != 0:
411:             if wrap_cov < COIL_OFF:
412:                 self.coil_low_since = s['t'] if self.coil_low_since is None else self.coil_low_since
413:                 if s['t']-self.coil_low_since >= 1.:
414:                     self.last_coil, self.coil_dir = (self.coil_dir, s['t']), 0.
415:             else:
```

## pilot.py:613-628
```text
613:                 coil_hard = min(coil_hard, float(np.sqrt(d2.min())-ro-hr))
614:         calm = (not ring and wrap_esc is None and attacker is None and big_risk < .5 and threat == 0 and not heap_chase
615:                 and safe[int(np.argmin(abs(ANGLES)))])
616:         if ring and coil_hard > HARD:
617:             # Coiling: full-rate turn every tick (no boost) -> the same circle lap after lap; leave it only if
618:             # that very circle is predicted to touch something.
619:             mode, i = 'coil', kc
620:         elif safe.any():
621:             mode = 'unwrap' if wrap_esc is not None else 'loop' if looping else 'evade' if attacker is not None else 'escape' if enclosed > .6 else 'feed' if eat.max() > 0 or goal_val > 0 else 'cruise'
622:             i = int(np.argmax(np.where(safe, score, -np.inf)))
623:             # Maneuver, not a one-tick command (P18: 891 returns to the old heading within 0.25 s, boost toggled
624:             # 134/min, a third of boost runs < 0.1 s - Codex run review). The held plan (the exact previous command)
625:             # stays while it is safe; a better plan replaces it only if it wins by SWITCH on CONFIRM ticks in a row
626:             # (same heading within 15 deg, same boost). An unsafe held plan is replaced at once.
627:             held = 2*C-1 if self.prev_boost else C-1
628:             if safe[held]:
```

## pilot.py:648-676
```text
648:         else:
649:             # No margin anywhere: first avoid contact at all, else put it off as long as possible.
650:             mode = 'emergency'
651:             # Among the candidates that touch last, stay close to the previous command (P2 thrashed here).
652:             hit = np.where((gap <= HARD).any(1), (gap <= HARD).argmax(1), N)
653:             e = (np.minimum(clear, 50.)+.2*np.minimum(onward, 100.)-30.*flip-40.*against-.3*np.degrees(abs(wrap(hd-prev)))
654:                  -1e6*(ring & flip))                         # boost free in an emergency; prefer ways on beyond 1.2 s
655:             if attacker is not None:       # P13: 3/3 deaths cut off by a head 60-90 px away while we cruised - run fast
656:                 e = e+W_RUN*threat*(np.cos(wrap(hd-away)) > .5)*(1.+bst)
657:             # Latest touch first; if all of those turn against our committed side, candidates on our side touching
658:             # within 3 steps (0.24 s) of it count as equal.
659:             # Codex #2: while coiling, only our turn direction is in the pool at all - compare touch times inside it.
660:             pool = ~wrong if ring else np.ones(2*C, bool)
661:             hmax = hit[pool].max()
662:             cand = pool & (hit == hmax)
663:             # hit == N means no touch within the horizon: never trade that for our side (Codex review 2).
664:             if hmax < N and not (cand & ~against).any() and (pool & (hit >= hmax-3) & ~against).any():
665:                 cand = pool & (hit >= hmax-3) & ~against
666:             i = int(np.argmax(np.where(cand, e, -np.inf)))
667:         held_i = 2*C-1 if self.prev_boost else C-1
668:         if bool(bst[i]) != self.prev_boost: self.boost_since = s['t']
669:         cmd = float(wrap(hd[i]))                  # exactly the evaluated candidate (Codex #1)
670:         if abs(wrap(cmd-ang)) > np.radians(30):
671:             self.side, self.side_until = float(np.sign(wrap(cmd-ang))), s['t']+SIDE_HOLD
672:         self.prev, self.prev_boost = cmd, bool(bst[i])
673: 
674:         # 1.c trace: nearest two different snakes and whether they are on opposite sides of us.
675:         thread = None
676:         if len(segs):
```

## run_live.py:41-76
```text
41: OBSERVE_JS = """([R, RF]) => {
42:   const s = window.slither;
43:   if (!window.playing || !s || s.dead) return null;
44:   const hx = s.xx, hy = s.yy, R2 = R * R, inr = (x, y) => (x-hx)*(x-hx) + (y-hy)*(y-hy) < R2,
45:         RF2 = RF * RF, inf = (x, y) => (x-hx)*(x-hx) + (y-hy)*(y-hy) < RF2;
46:   const segs = [], sid = [], heads = [], hid = [], food = [], own = [];
47:   for (const o of slithers) {
48:     if (o === s || o.dead) continue;
49:     const r = 14.5 * o.sc, P = o.pts;
50:     let px = null, py = null, pin = false;
51:     for (let i = 0; i <= P.length; i++) {
52:       let x, y;
53:       if (i < P.length) { if (P[i].dying) continue; x = P[i].xx; y = P[i].yy; } else { x = o.xx; y = o.yy; }
54:       const inn = inr(x, y);
55:       if (px !== null && (inn || pin)) { segs.push(px, py, x, y, r); sid.push(o.id); }
56:       px = x; py = y; pin = inn;
57:     }
58:     if (inf(o.xx, o.yy)) { heads.push(o.xx, o.yy, o.ang, o.sp, o.sc); hid.push(o.id); }
59:   }
60:   for (let i = 0; i < foods_c; i++) { const f = foods[i]; if (f && !f.eaten && inf(f.xx, f.yy)) food.push(f.xx, f.yy, f.sz); }
61:   for (const p of s.pts) if (!p.dying) own.push(p.xx, p.yy);
62:   own.push(hx, hy);
63:   const pack = a => { const u = new Uint8Array(new Float32Array(a).buffer); let t = '';
64:     for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
65:     return btoa(t); };
66:   const sct = s.sct + s.rsc;
67:   return {pt: performance.now(), x: hx, y: hy, ang: s.ang, sp: s.sp, sc: s.sc, boost: s.md, wall: [grd, grd, flux_grd], rank,
68:           L: Math.floor((fpsls[sct] + s.fam / fmlts[sct] - 1) * 15 - 5),
69:           segs: pack(segs), sid: pack(sid), heads: pack(heads), hid: pack(hid), food: pack(food), own: pack(own)};
70: }"""
71: COMMAND_JS = """([a, b]) => {
72:   if (!window.playing || !window.slither || window.slither.dead || window.__stop) return false;
73:   window.__lastCmd = Date.now();
74:   window.xm = Math.cos(a) * 250; window.ym = Math.sin(a) * 250;
75:   window.setAcceleration(b ? 1 : 0);
76:   return performance.now();            // page clock when the command took effect in the page
```
